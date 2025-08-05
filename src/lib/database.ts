import { createClient } from './supabase'

export interface User {
  id: string
  email: string
  created_at: string
}

export interface Conversation {
  id: string
  user_id: string
  conversation_topic: string
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  timestamp: string
  sender: string
  content: string // This will now store encrypted content
}

// Get user by ID
export async function getUserById(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('Users')
    .select('*')
    .eq('id', userId)
    .single()
  
  return { data, error }
}

// Get user conversations
export async function getUserConversations(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('Conversations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  return { data, error }
}

// Create new conversation
export async function createConversation(userId: string, topic: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('Conversations')
    .insert({
      user_id: userId,
      conversation_topic: topic,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()
  
  return { data, error }
}

// Get messages for a conversation (with decryption)
export async function getConversationMessages(conversationId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('Messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true })
  
  if (error) return { data: null, error }
  
  // Decrypt messages
  const { MessageEncryption } = await import('./encryption')
  const decryptedMessages = data?.map(message => ({
    ...message,
    content: MessageEncryption.decryptMessage(message.content)
  })) || []
  
  return { data: decryptedMessages, error: null }
}

// Add message to conversation with encryption
export async function addMessage(conversationId: string, sender: string, content: string) {
  const supabase = createClient()
  
  // Import encryption utility
  const { MessageEncryption } = await import('./encryption')
  
  // Encrypt content before storing
  const encryptedContent = MessageEncryption.encryptMessage(content)
  
  const { data, error } = await supabase
    .from('Messages')
    .insert({
      conversation_id: conversationId,
      sender,
      content: encryptedContent, // Store encrypted content directly
      timestamp: new Date().toISOString(),
    })
    .select()
    .single()
  
  return { data, error }
}

// Delete conversation and all its messages
export async function deleteConversation(conversationId: string) {
  const supabase = createClient()
  
  // First delete all messages in the conversation
  const { error: messagesError } = await supabase
    .from('Messages')
    .delete()
    .eq('conversation_id', conversationId)
  
  if (messagesError) {
    return { error: messagesError }
  }
  
  // Then delete the conversation
  const { error: conversationError } = await supabase
    .from('Conversations')
    .delete()
    .eq('id', conversationId)
  
  return { error: conversationError }
} 