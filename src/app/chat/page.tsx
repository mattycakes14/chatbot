'use client'

// Handles conversation, messages, and pagination for chat page
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect, useRef } from 'react'
import { Conversation, Message } from '@/lib/database'
import MessageInput from '@/components/chat/MessageInput'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { apiClient } from '@/lib/api-client'

export default function ChatPage() {
  const { user, signOut } = useAuth() // handles user auth session
  const [conversations, setConversations] = useState<Conversation[]>([]) // conversations state
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null) // selected conversation state
  const [messages, setMessages] = useState<Message[]>([]) // messages state
  const [loading, setLoading] = useState(true) // loading state
  const [error, setError] = useState<string | null>(null) // error state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false) // delete dialog state
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null) // conversation to delete
  const [aiTyping, setAiTyping] = useState(false)

  // Pagination state
  const [page, setPage] = useState(1) // page number 
  const [hasMore, setHasMore] = useState(true) // has more messages
  const [loadingMore, setLoadingMore] = useState(false) 
  const [totalMessages, setTotalMessages] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const MESSAGES_PER_PAGE = 50 // messages per page

  // Load user's conversations
  useEffect(() => {
    if (user) {
      loadConversations()
    }
  }, [user])

  // Reset pagination when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      setPage(1) // reset page number
      setHasMore(true) // reset has more messages
      setMessages([]) // reset messages 
      loadMessages(selectedConversation.id, 1, true) // load messages for selected conversation
    }
  }, [selectedConversation])

  // Load conversations via API with better error handling
  const loadConversations = async () => {
    try {
      setLoading(true)
      setError(null)
      const { conversations } = await apiClient.getConversations()
      setConversations(conversations)
    } catch (error) {
      console.error('Error loading conversations:', error)
      setError('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  // Load messages via API with better error handling
  const loadMessages = async (conversationId: string, pageNum: number = 1, reset: boolean = false) => {
    try {
      setLoadingMore(true)
      setError(null)
      
      const { messages, total, hasMore: moreMessages } = await apiClient.getMessages(
        conversationId, 
        pageNum, 
        MESSAGES_PER_PAGE
      )

      setTotalMessages(total)
      setHasMore(moreMessages)
      
      if (reset) {
        setMessages(messages)
      } else {
        setMessages(prev => [...messages, ...prev])
      }

    } catch (error) {
      console.error('Error loading messages:', error)
      setError('Failed to load messages')
    } finally {
      setLoadingMore(false)
    }
  }

  // Scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Handle conversation selection
  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation)
  }

  // Create new conversation via API with better error handling
  const createNewConversation = async () => {
    try {
      setError(null)
      const { conversation } = await apiClient.createConversation('New Conversation')
      
      // Add new conversation to the beginning of the list
      setConversations(prev => [conversation, ...prev])
      setSelectedConversation(conversation)
    } catch (error) {
      console.error('Error creating conversation:', error)
      setError('Failed to create conversation')
    }
  }

  // Update conversation topic via API
  const updateConversationTopic = async (conversationId: string, firstMessage: string) => {
    try {
      // Extract first few words as topic (max 50 characters)
      const topic = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '')

      // Update local state immediately for better UX
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, conversation_topic: topic }
            : conv
        )
      )

      // TODO: Add API endpoint for updating conversation topic
      // await apiClient.updateConversationTopic(conversationId, topic)

    } catch (error) {
      console.error('Error updating conversation topic:', error)
    }
  }

  // Handle delete conversation
  const handleDeleteConversation = (conversation: Conversation) => {
    setConversationToDelete(conversation)
    setShowDeleteDialog(true)
  }

  // Confirm delete conversation via API
  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return

    try {
      await apiClient.deleteConversation(conversationToDelete.id)
      
      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.id !== conversationToDelete.id))
      
      // If this was the selected conversation, clear selection
      if (selectedConversation?.id === conversationToDelete.id) {
        setSelectedConversation(null)
        setMessages([])
      }

      setShowDeleteDialog(false)
      setConversationToDelete(null)
    } catch (error) {
      console.error('Error deleting conversation:', error)
      setError('Failed to delete conversation')
    }
  }

  // Handle new message sent
  const handleMessageSent = (message: Message) => {
    // Add message to local state (already decrypted from API)
    setMessages(prev => [...prev, message])
    
    // Scroll to bottom after a short delay to ensure DOM is updated
    setTimeout(scrollToBottom, 100)
  }

  // Handle AI typing start
  const handleAiTypingStart = () => {
    setAiTyping(true)
  }

  // Handle AI typing stop
  const handleAiTypingStop = () => {
    setAiTyping(false)
  }

  // Handle first message (for updating conversation topic)
  const handleFirstMessage = (firstMessage: string) => {
    if (selectedConversation) {
      updateConversationTopic(selectedConversation.id, firstMessage)
    }
  }

  // Handle sign out with error handling
  const handleSignOut = async () => {
    try {
      console.log('User clicked sign out')
      await signOut()
    } catch (error) {
      console.error('Error in handleSignOut:', error)
      // Force redirect even if there's an error
      window.location.href = '/login'
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-xl font-semibold text-gray-900">Chat Dashboard</h1>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Welcome, {user?.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-red-600 hover:text-red-800 transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="flex h-[600px]">
              {/* Left Sidebar - Conversations */}
              <div className="w-80 border-r border-gray-200 flex flex-col">
                {/* New Conversation Button */}
                <div className="p-4 border-b border-gray-200">
                  <button
                    onClick={createNewConversation}
                    className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    + New Conversation
                  </button>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-center text-gray-500">
                      Loading conversations...
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No conversations yet. Start a new one!
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {conversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          className={`group relative ${
                            selectedConversation?.id === conversation.id
                              ? 'bg-indigo-50 border-r-2 border-indigo-600'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <button
                            onClick={() => handleConversationSelect(conversation)}
                            className="w-full text-left p-4 transition-colors"
                          >
                            <div className="font-medium text-gray-900 truncate">
                              {conversation.conversation_topic}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(conversation.created_at).toLocaleDateString()}
                            </div>
                          </button>
                          {/* Delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteConversation(conversation)
                            }}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800 p-1"
                            title="Delete conversation"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side - Messages */}
              <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                  <>
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4" ref={messagesContainerRef}>
                      {loadingMore && (
                        <div className="text-center py-2">
                          <div className="inline-flex items-center space-x-2 text-gray-600">
                            <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                            <span>Loading more messages...</span>
                          </div>
                        </div>
                      )}

                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`mb-4 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.sender === 'user'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-800'
                            }`}
                          >
                            <div className="text-sm font-semibold mb-1">
                              {message.sender === 'user' ? 'You' : 'Vivian Tran'}
                            </div>
                            <div className="text-sm">{message.content}</div>
                          </div>
                        </div>
                      ))}

                      {aiTyping && (
                        <div className="flex justify-start mb-4">
                          <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                              <span className="text-sm text-gray-600">Vivian Tran is typing...</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Invisible div for scrolling to bottom */}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <MessageInput
                      conversationId={selectedConversation.id}
                      onMessageSent={handleMessageSent}
                      onFirstMessage={handleFirstMessage}
                      onTypingStart={handleAiTypingStart}
                      onTypingStop={handleAiTypingStop}
                    />
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <p className="text-lg">Select a conversation to start chatting</p>
                      <p className="text-sm mt-2">Or create a new conversation to begin</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={confirmDeleteConversation}
          title="Delete Conversation"
          message={`Are you sure you want to delete "${conversationToDelete?.conversation_topic}"? This action cannot be undone and will delete all messages in this conversation.`}
          confirmText="Delete Conversation"
          cancelText="Cancel"
        />
      </div>
    </ProtectedRoute>
  )
} 