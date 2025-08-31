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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false) // sidebar collapse state

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-lg border-b border-slate-200/60 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="text-slate-600 hover:text-slate-900 transition-colors p-2 rounded-lg hover:bg-slate-100"
                  title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h1 className="text-xl font-semibold text-slate-900">ABG.AI</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-slate-500">
                  {user?.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-slate-600 hover:text-slate-900 transition-colors px-3 py-1 rounded-lg hover:bg-slate-100"
                  disabled={loading}
                >
                  {loading ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
            <div className="flex h-[calc(100vh-200px)] relative">
              {/* Left Sidebar - Conversations */}
              <div className={`${
                sidebarCollapsed ? 'w-0' : 'w-80'
              } border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out overflow-hidden bg-slate-50/50`}>
                {!sidebarCollapsed && (
                  <>
                    {/* New Conversation Button */}
                    <div className="p-4 border-b border-slate-200">
                      <button
                        onClick={createNewConversation}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span>New Chat</span>
                        </div>
                      </button>
                    </div>

                    {/* Conversations List */}
                    <div className="flex-1 overflow-y-auto p-2">
                      {loading ? (
                        <div className="p-4 text-center text-slate-500">
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          Loading conversations...
                        </div>
                      ) : conversations.length === 0 ? (
                        <div className="p-6 text-center text-slate-500">
                          <div className="space-y-3">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </div>
                            <p className="font-medium">No conversations yet</p>
                            <p className="text-sm">Start a new chat to begin!</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {conversations.map((conversation) => (
                            <div
                              key={conversation.id}
                              className={`group relative rounded-xl transition-all duration-200 ${
                                selectedConversation?.id === conversation.id
                                  ? 'bg-blue-50 border-l-4 border-blue-500 shadow-sm'
                                  : 'hover:bg-slate-100'
                              }`}
                            >
                              <button
                                onClick={() => handleConversationSelect(conversation)}
                                className="w-full text-left p-3 transition-colors"
                              >
                                <div className="font-medium text-slate-900 truncate mb-1">
                                  {conversation.conversation_topic}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {new Date(conversation.created_at).toLocaleDateString()}
                                </div>
                              </button>
                              {/* Delete button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteConversation(conversation)
                                }}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50"
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
                  </>
                )}
              </div>

              {/* Floating New Conversation Button (when sidebar is collapsed) */}
              {sidebarCollapsed && (
                <div className="absolute top-4 left-4 z-10">
                  <button
                    onClick={createNewConversation}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 rounded-full hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    title="New Conversation"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Right Side - Messages */}
              <div className="flex-1 flex flex-col bg-white">
                {selectedConversation ? (
                  <>
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={messagesContainerRef}>
                      {loadingMore && (
                        <div className="text-center py-4">
                          <div className="inline-flex items-center space-x-2 text-slate-500">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span>Loading more messages...</span>
                          </div>
                        </div>
                      )}

                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                            message.sender === 'user'
                              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                              : 'bg-slate-100 text-slate-900 border border-slate-200'
                          }`}>
                            <div className={`text-xs font-medium mb-1 ${
                              message.sender === 'user' ? 'text-blue-100' : 'text-slate-500'
                            }`}>
                              {message.sender === 'user' ? 'You' : 'Vivian Tran'}
                            </div>
                            <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                          </div>
                        </div>
                      ))}

                      {aiTyping && (
                        <div className="flex justify-start">
                          <div className="bg-slate-100 border border-slate-200 px-4 py-3 rounded-2xl shadow-sm">
                            <div className="flex items-center space-x-2">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                              <span className="text-sm text-slate-500">Vivian Tran is typing...</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Invisible div for scrolling to bottom */}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <div className="border-t border-slate-200 bg-slate-50/50">
                      <MessageInput
                        conversationId={selectedConversation.id}
                        onMessageSent={handleMessageSent}
                        onFirstMessage={handleFirstMessage}
                        onTypingStart={handleAiTypingStart}
                        onTypingStop={handleAiTypingStop}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-slate-50/30">
                    <div className="text-center max-w-sm">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Welcome to ABG.AI</h3>
                      <p className="text-slate-500 mb-4">Select a conversation to start chatting or create a new one to begin.</p>
                      <button
                        onClick={createNewConversation}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        Start New Chat
                      </button>
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