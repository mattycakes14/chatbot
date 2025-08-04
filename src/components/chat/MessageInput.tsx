'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Message } from '@/lib/database'

interface MessageInputProps {
  conversationId: string
  onMessageSent: (message: Message) => void
}

export default function MessageInput({ conversationId, onMessageSent }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const sendMessage = async () => {
    if (!message.trim() || loading) return

    setLoading(true)
    const userMessage = message.trim()
    setMessage('')

    try {
      
      // Insert usr message record within conversation_id
      const { data: userMsgData, error: userMsgError } = await supabase
        .from('Messages')
        .insert({
          conversation_id: conversationId,
          sender: 'user',
          content: userMessage,
          timestamp: new Date().toISOString(),
        })
        .select()
        .single()

      if (userMsgError) throw userMsgError

      // Add user message to UI immediately
      if (userMsgData) {
        onMessageSent(userMsgData)
      }

      // TODO: Send to LLM API and get response
      const aiResponse = await getAIResponse(userMessage)

      // Insert AI response record into conversation_id
      const { data: aiMsgData, error: aiMsgError } = await supabase
        .from('Messages')
        .insert({
          conversation_id: conversationId,
          sender: 'ai',
          content: aiResponse,
          timestamp: new Date().toISOString(),
        })
        .select()
        .single()

      if (aiMsgError) throw aiMsgError

      // Add AI message to UI
      if (aiMsgData) {
        onMessageSent(aiMsgData)
      }

    } catch (error: any) {
      console.error('Error sending message:', error)
      // Revert the message input if there was an error
      setMessage(userMessage)
    } finally {
      setLoading(false)
    }
  }

  // Configure OpenAI + give it chatbot personality
  const getAIResponse = async (userMessage: string): Promise<string> => {
    console.log(userMessage)
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Mock AI responses based on user input
    const responses = [
      "I understand you're asking about that. Let me help you with that.",
      "That's an interesting question! Here's what I think about it...",
      "I'd be happy to help you with that. Let me provide some information.",
      "Thanks for sharing that with me. I have some thoughts on this topic.",
      "I see what you're getting at. Let me break this down for you."
    ]
    
    return responses[Math.floor(Math.random() * responses.length)]
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="p-4 border-t border-gray-200">
      <div className="flex space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={loading}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !message.trim()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sending...
            </div>
          ) : (
            'Send'
          )}
        </button>
      </div>
    </div>
  )
} 