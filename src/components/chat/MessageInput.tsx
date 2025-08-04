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
    try {
      console.log('User message:', userMessage)
      
      // Get conversation history for context
      const { data: conversationHistory } = await supabase
        .from('Messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true })

      // Prepare messages for OpenAI (include conversation history)
      const messages = conversationHistory?.map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      })) || []

      // Add the new user message
      messages.push({ role: 'user', content: userMessage })

      console.log("AI executed");
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `
              You are a Frat Bro that is snobby, obnoxious, and sound like a douchebag (Use emojis and Frat lingo/slang. i.e., Ferda, Pong, Brewskis)
                `
            },
            ...messages
          ],
          max_tokens: 1000,
          temperature: 0.6,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('OpenAI API error:', errorData)
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      }

      console.log("Hit the endpoint");
      const data = await response.json()
      const aiResponse = data.choices[0]?.message?.content

      if (!aiResponse) {
        throw new Error('No response from OpenAI')
      }

      console.log('AI response:', aiResponse)
      return aiResponse

    } catch (error: any) {
      console.error('Error getting AI response:', error)
      return 'Sorry, I encountered an error. Please try again.'
    }
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
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 text-gray-900 placeholder-gray-500 bg-white"
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