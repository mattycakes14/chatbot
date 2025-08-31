import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { rateLimit } from '@/lib/rate-limit'
import { InputSanitizer } from '@/lib/sanitization'

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
})

// FastAPI backend configuration
const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || 'https://langchain-agent-backend-production.up.railway.app'
const FASTAPI_API_KEY = process.env.FASTAPI_API_KEY

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    await limiter.check(request, 10, 'LLM_API')
  } catch {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  try {
    const supabase = createClient(request)
    const body = await request.json()
    const { conversationId, message, context } = body

    // Validate input
    if (!conversationId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Sanitize message
    const { sanitized, isValid, error: sanitizeError } = InputSanitizer.sanitizeAndValidate(message)
    
    if (!isValid) {
      return NextResponse.json({ error: `Invalid message: ${sanitizeError}` }, { status: 400 })
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns this conversation
    const { data: conversation } = await supabase
      .from('Conversations')
      .select('user_id')
      .eq('id', conversationId)
      .single()

    if (!conversation || conversation.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get conversation history for context
    const { data: messages } = await supabase
      .from('Messages')
      .select('sender, content, timestamp')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true })
      .limit(10) // Last 10 messages for context

    // Prepare request to FastAPI backend
    const fastApiRequest = {
      prompt: sanitized,
      user_id: user.id
    }

    // Call FastAPI backend
    const fastApiResponse = await fetch(`${FASTAPI_BASE_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fastApiRequest)
    })
    console.log(fastApiResponse)
    if (!fastApiResponse.ok) {
      const errorData = await fastApiResponse.json().catch(() => ({}))
      console.error('FastAPI error:', errorData)
      return NextResponse.json({ 
        error: 'LLM service unavailable',
        details: errorData.error || 'Backend service error'
      }, { status: fastApiResponse.status })
    }

    // Since FastAPI returns just a plain string, get it as text
    const llmResponse = await fastApiResponse.text()

    console.log('FastAPI response (string):', llmResponse)
    
    // Parse escape sequences (like \n, \t, etc.) from the string
    let formattedResponse = llmResponse || 'Sorry, I could not generate a response.'
    
    // Remove surrounding quotes if they exist
    formattedResponse = formattedResponse.replace(/^["']|["']$/g, '')
    
    // Handle common escape sequences
    formattedResponse = formattedResponse
      .replace(/\\n/g, '\n')        // Convert \n to actual newlines
      .replace(/\\t/g, '\t')        // Convert \t to actual tabs
      .replace(/\\r/g, '\r')        // Convert \r to carriage returns
      .replace(/\\"/g, '"')         // Convert \" to actual quotes
      .replace(/\\\\/g, '\\')       // Convert \\ to actual backslashes

    return NextResponse.json({
      response: formattedResponse,
      conversation_id: conversationId
    })

  } catch (error) {
    console.error('LLM API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 