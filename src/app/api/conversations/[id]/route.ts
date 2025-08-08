import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
})

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting
    await limiter.check(request, 10, 'DELETE_CONVERSATION_API')
  } catch {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  try {
    const supabase = createClient()
    const conversationId = await params.id
  

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

    // Delete messages first
    const { error: messagesError } = await supabase
      .from('Messages')
      .delete()
      .eq('conversation_id', conversationId)

    if (messagesError) {
      console.error('Error deleting messages:', messagesError)
      return NextResponse.json({ error: 'Failed to delete messages' }, { status: 500 })
    }

    // Delete conversation
    const { error: conversationError } = await supabase
      .from('Conversations')
      .delete()
      .eq('id', conversationId)

    if (conversationError) {
      console.error('Error deleting conversation:', conversationError)
      return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting
    await limiter.check(request, 10, 'UPDATE_CONVERSATION_API')
  } catch {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  try {
    const supabase = createClient()
    const conversationId = params.id
    const body = await request.json()
    const { topic } = body

    // Validate input
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Invalid topic' }, { status: 400 })
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

    // Update conversation topic
    const { data, error } = await supabase
      .from('Conversations')
      .update({ conversation_topic: topic })
      .eq('id', conversationId)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 })
    }

    return NextResponse.json({ conversation: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 