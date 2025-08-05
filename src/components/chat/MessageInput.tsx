// Handles AI and user message input
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Message } from '@/lib/database'
import { openRouterService } from '@/lib/openrouter-service'
import { MessageEncryption } from '@/lib/encryption'
import { InputSanitizer } from '@/lib/sanitization'

interface MessageInputProps {
  conversationId: string
  onMessageSent: (message: Message) => void
  onFirstMessage?: (message: string) => void
  onTypingStart?: () => void
  onTypingStop?: () => void
}

export default function MessageInput({ 
  conversationId, 
  onMessageSent, 
  onFirstMessage,
  onTypingStart,
  onTypingStop
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiTyping, setAiTyping] = useState(false)
  const [validationError, setValidationError] = useState('')
  const supabase = createClient()

  const sendMessage = async () => {
    if (!message.trim()) return

    const userMessage = message.trim()
    setMessage('')
    setValidationError('')
    setLoading(true)
    setAiTyping(true)
    onTypingStart?.()

    try {
      // Check if this is the first message in the conversation
      const { data: existingMessages } = await supabase
        .from('Messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .limit(1)

      const isFirstMessage = !existingMessages || existingMessages.length === 0

      // Sanitize user input
      const { sanitized: sanitizedUserMessage, isValid, error } = InputSanitizer.sanitizeAndValidate(userMessage)
      
      if (!isValid) {
        throw new Error(error || 'Invalid input')
      }

      // Encrypt user message content
      const encryptedUserContent = MessageEncryption.encryptMessage(sanitizedUserMessage)

      // Insert user message record with encrypted content
      const { data: userMsgData, error: userMsgError } = await supabase
        .from('Messages')
        .insert({
          conversation_id: conversationId,
          sender: 'user',
          content: encryptedUserContent, // Store encrypted content directly
          timestamp: new Date().toISOString(),
        })
        .select()
        .single()

      if (userMsgError) {
        console.error('User message error:', userMsgError)
        throw userMsgError
      }

      // Add user message to UI immediately (decrypt for display)
      if (userMsgData) {
        const decryptedUserMessage = {
          ...userMsgData,
          content: sanitizedUserMessage // Use original sanitized content for display
        }
        onMessageSent(decryptedUserMessage)
      }

      // If this is the first message, update the conversation topic
      if (isFirstMessage && onFirstMessage) {
        onFirstMessage(sanitizedUserMessage)
      }

      // Get AI response from OpenRouter
      const aiResponse = await getAIResponse(sanitizedUserMessage)

      // Sanitize AI response
      const { sanitized: sanitizedAiResponse } = InputSanitizer.sanitizeAndValidate(aiResponse)

      // Encrypt AI response content
      const encryptedAiContent = MessageEncryption.encryptMessage(sanitizedAiResponse)

      // Insert AI response record with encrypted content
      const { data: aiMsgData, error: aiMsgError } = await supabase
        .from('Messages')
        .insert({
          conversation_id: conversationId,
          sender: 'ai',
          content: encryptedAiContent, // Store encrypted content directly
          timestamp: new Date().toISOString(),
        })
        .select()
        .single()

      if (aiMsgError) {
        console.error('AI message error:', aiMsgError)
        throw aiMsgError
      }

      // Add AI message to UI (decrypt for display)
      if (aiMsgData) {
        const decryptedAiMessage = {
          ...aiMsgData,
          content: sanitizedAiResponse // Use original sanitized content for display
        }
        onMessageSent(decryptedAiMessage)
      }

    } catch (error: any) {
      console.error('Error sending message:', error)
      // Revert the message input if there was an error
      setMessage(userMessage)
      setValidationError(`Failed to send message: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
      setAiTyping(false)
      onTypingStop?.()
    }
  }

  // Get AI response from OpenRouter
  const getAIResponse = async (userMessage: string): Promise<string> => {
    try {
      console.log('User message:', userMessage)
      
      // Get conversation history for context (limit to recent messages for performance)
      const { data: conversationHistory } = await supabase
        .from('Messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true })
        .limit(20) // Limit to last 20 messages for context

      // Decrypt conversation history for AI context
      const decryptedHistory = conversationHistory?.map(msg => ({
        ...msg,
        content: MessageEncryption.decryptMessage(msg.content)
      })) || []

      // Prepare messages for OpenRouter (include conversation history)
      const messages = decryptedHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }))

      // Add system message at the beginning to define AI behavior
      const systemMessage = {
        role: 'system' as const,
        content: `You are a frat bro who is very snobby and talks like a douchebag:
        - You love to talk about your frat and hosting parties
        - Listen to only house and EDM music (Fisher, Tiesto, John Summit, etc.)
        - You're always trying to impress people with your lifestyle
        - Use phrases like "bro", "dude", "sick", "fire", "lit", "vibes"
        - Be confident but slightly arrogant
        - Keep responses concise and energetic`
      }

      // Combine system message with conversation history
      const allMessages = [systemMessage, ...messages]

      // Call OpenRouter API
      const response = await openRouterService.callGPT4(allMessages)
      
      // Check for errors first
      if (response.error) {
        throw new Error(response.error)
      }
      
      // Return the content directly (the service already handles the response format)
      return response.content || 'Sorry, I could not generate a response.'

    } catch (error) {
      console.error('Error getting AI response:', error)
      throw error
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)
    setValidationError('')
  }

  return (
    <div className="flex flex-col space-y-4 p-4 bg-white border-t">
      {validationError && (
        <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
          {validationError}
        </div>
      )}
      
      <div className="flex space-x-2">
        <input
          type="text"
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={loading}
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !message.trim()}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{aiTyping ? 'AI typing...' : 'Sending...'}</span>
            </div>
          ) : (
            'Send'
          )}
        </button>
      </div>
      
      {aiTyping && (
        <div className="flex items-center space-x-2 text-gray-500 text-sm">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <span>AI is thinking...</span>
        </div>
      )}
    </div>
  )
} 