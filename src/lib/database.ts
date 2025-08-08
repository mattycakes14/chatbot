// Remove all client-side database functions - they're now handled by API routes

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
  content: string
}

// All database operations are now handled by secure API routes
// This file only contains TypeScript interfaces 