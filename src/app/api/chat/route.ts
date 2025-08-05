import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { InputSanitizer } from '@/lib/sanitization'

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
})

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    await limiter.check(request, 10, 'CHAT_API') // 10 requests per minute
  } catch {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' }, 
      { status: 429 }
    )
  }

  try {
    // Validate request
    const body = await request.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array required' },
        { status: 400 }
      )
    }

    // Validate and sanitize each message
    for (const message of messages) {
      if (!message.role || !message.content) {
        return NextResponse.json(
          { error: 'Invalid message format' },
          { status: 400 }
        )
      }

      // Sanitize message content
      const { sanitized, isValid, error } = InputSanitizer.sanitizeAndValidate(message.content)
      
      if (!isValid) {
        return NextResponse.json(
          { error: `Message validation failed: ${error}` },
          { status: 400 }
        )
      }

      // Update message with sanitized content
      message.content = sanitized
    }

    // Call OpenRouter API server-side
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': request.headers.get('origin') || '',
        'X-Title': 'Chatbot App',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4',
        messages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenRouter API error:', response.status, errorData)
      
      return NextResponse.json(
        { error: `AI service error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Sanitize AI response before returning
    const { sanitized: sanitizedResponse } = InputSanitizer.sanitizeAndValidate(
      data.choices[0]?.message?.content || 'No response from AI'
    )
    
    return NextResponse.json({
      content: sanitizedResponse,
      model: data.model,
      usage: data.usage,
    })
  } catch (error: any) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 