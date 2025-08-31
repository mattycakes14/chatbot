// Handles AI and user message input
'use client'

import { useState } from 'react'
import { Message } from '@/lib/database'
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

      // Get AI response from FastAPI backend
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
      console.log('Full API response:', response)
      
      // Extract content from the response structure
      // The API route now returns { response: "string from FastAPI" }
      if (response.response) {
        return response.response
      } else if (typeof response === 'string') {
        return response
      }
      
      console.warn('Unexpected response structure:', response)
      return 'Sorry, I could not generate a response.'

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
    <div className="p-6">
      {validationError && (
        <div className="mb-4 text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-xl">
          {validationError}
        </div>
      )}
      
      <div className="flex space-x-3">
        <input
          type="text"
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={loading}
          className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 placeholder-slate-400 transition-all duration-200 hover:border-slate-300"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !message.trim()}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:hover:shadow-lg"
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="hidden sm:inline">{aiTyping ? 'AI is typing...' : 'Sending...'}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span>Send</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
          )}
        </button>
      </div>
      
      {aiTyping && (
        <div className="flex items-center space-x-2 text-slate-500 text-sm mt-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <span>Vivian Tran is thinking...</span>
        </div>
      )}
    </div>
  )
} 