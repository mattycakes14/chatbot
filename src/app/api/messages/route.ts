import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { rateLimit } from '@/lib/rate-limit'
import { MessageEncryption } from '@/lib/encryption'
import { InputSanitizer } from '@/lib/sanitization'

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
})

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    await limiter.check(request, 100, 'MESSAGES_API')
  } catch {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  try {
    const supabase = createClient(request)
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 })
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

    // Calculate pagination
    const offset = (page - 1) * limit

    // Get total count
    const { count } = await supabase
      .from('Messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)

    // Get messages with pagination
    const { data, error } = await supabase
      .from('Messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Decrypt messages
    const decryptedMessages = (data || []).map(message => ({
      ...message,
      content: MessageEncryption.decryptMessage(message.content)
    }))

    return NextResponse.json({
      messages: decryptedMessages,
      total: count || 0,
      hasMore: (data?.length || 0) === limit && (offset + limit) < (count || 0)
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    await limiter.check(request, 20, 'MESSAGES_API')
  } catch {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  try {
    const supabase = createClient(request)
    const body = await request.json()
    const { conversationId, content, sender } = body

    // Validate input
    if (!conversationId || !content || !sender) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Sanitize content
    const { sanitized, isValid, error: sanitizeError } = InputSanitizer.sanitizeAndValidate(content)
    
    if (!isValid) {
      return NextResponse.json({ error: `Invalid content: ${sanitizeError}` }, { status: 400 })
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

    // Encrypt content
    const encryptedContent = MessageEncryption.encryptMessage(sanitized)

    // Insert message
    const { data, error } = await supabase
      .from('Messages')
      .insert({
        conversation_id: conversationId,
        sender,
        content: encryptedContent,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to add message' }, { status: 500 })
    }

    // Return decrypted message for immediate display
    const decryptedMessage = {
      ...data,
      content: sanitized // Use original sanitized content
    }

    return NextResponse.json({ message: decryptedMessage })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 