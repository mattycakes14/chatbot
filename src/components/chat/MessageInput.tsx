// Handles AI and user message input
'use client'

import { useState } from 'react'
import { Message } from '@/lib/database'
import { openRouterService } from '@/lib/openrouter-service'
import { InputSanitizer } from '@/lib/sanitization'
import { apiClient } from '@/lib/api-client'

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

  const sendMessage = async () => {
    if (!message.trim()) return

    const userMessage = message.trim()
    setMessage('')
    setValidationError('')
    setLoading(true)
    setAiTyping(true)
    onTypingStart?.()

    try {
      // Sanitize user input
      const { sanitized: sanitizedUserMessage, isValid, error } = InputSanitizer.sanitizeAndValidate(userMessage)
      
      if (!isValid) {
        throw new Error(error || 'Invalid input')
      }

      // Add user message via API
      const { message: userMsgData } = await apiClient.addMessage(
        conversationId,
        sanitizedUserMessage,
        'user'
      )

      // Add user message to UI immediately
      onMessageSent(userMsgData)

      // Check if this is the first message
      const isFirstMessage = true // We'll determine this from the API response
      if (isFirstMessage && onFirstMessage) {
        onFirstMessage(sanitizedUserMessage)
      }

      // Get AI response from OpenRouter
      const aiResponse = await getAIResponse(sanitizedUserMessage)

      // Sanitize AI response
      const { sanitized: sanitizedAiResponse } = InputSanitizer.sanitizeAndValidate(aiResponse)

      // Add AI response via API
      const { message: aiMsgData } = await apiClient.addMessage(
        conversationId,
        sanitizedAiResponse,
        'ai'
      )

      // Add AI message to UI
      onMessageSent(aiMsgData)

    } catch (error: unknown) {
      console.error('Error sending message:', error)
      // Revert the message input if there was an error
      setMessage(userMessage)
      setValidationError(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
      setAiTyping(false)
      onTypingStop?.()
    }
  }

    // Get AI response from FastAPI backend
  const getAIResponse = async (userMessage: string): Promise<string> => {
    try {
      // Use the Next.js API route to avoid CORS issues
      const response = await apiClient.sendChatMessage(conversationId, userMessage)
      console.log(response)
      // Return the response from the FastAPI backend
      return response.response || 'Sorry, I could not generate a response.'

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
    <div className="flex flex-col space-y-4 p-4 bg-gray-800 border-t border-gray-700">
      {validationError && (
        <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded border border-red-800">
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
          className="text-white bg-gray-700 flex-1 p-3 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 placeholder-gray-400"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !message.trim()}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{aiTyping ? 'Vivian Tran is typing...' : 'Sending...'}</span>
            </div>
          ) : (
            'Send'
          )}
        </button>
      </div>
      
      {aiTyping && (
        <div className="flex items-center space-x-2 text-gray-400 text-sm">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <span>Vivian Tran is thinking...</span>
        </div>
      )}
    </div>
  )
} 