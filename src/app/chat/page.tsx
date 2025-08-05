'use client'

// Handles conversation, messages, and pagination for chat page
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Conversation, Message } from '@/lib/database'
import MessageInput from '@/components/chat/MessageInput'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { MessageEncryption } from '@/lib/encryption'

export default function ChatPage() {
  const { user, signOut } = useAuth() // handles user auth session
  const [conversations, setConversations] = useState<Conversation[]>([]) // conversations state
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null) // selected conversation state
  const [messages, setMessages] = useState<Message[]>([]) // messages state
  const [loading, setLoading] = useState(true) // loading state
  const [error, setError] = useState<string | null>(null) // error state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false) // delete dialog state
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null) // conversation to delete
  const supabase = createClient() // supabase client
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

  // on change of user, load conversations for corresponding user
  const loadConversations = async () => {
    try {
      setLoading(true)
      
      // fetch every conversation and column for correspond user_id
      const { data, error } = await supabase
        .from('Conversations')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // set state for conversations from data
      setConversations(data || [])

    } catch (error: unknown) {
      console.error('Error loading conversations:', error)
      setError('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  // Load messages for selected conversation with pagination and decryption
  const loadMessages = async (conversationId: string, pageNum: number = 1, reset: boolean = false) => {
    try {
      setLoadingMore(true)
      
      // Calculate offset for pagination (index to start from for next batch of messages)
      const offset = (pageNum - 1) * MESSAGES_PER_PAGE
      
      // Get total count first
      const { count } = await supabase
        .from('Messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)

      setTotalMessages(count || 0)

      // fetch messages with pagination
      const { data, error } = await supabase
        .from('Messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true })
        .range(offset, offset + MESSAGES_PER_PAGE - 1)

      if (error) throw error
      
      // Decrypt messages before setting state
      const decryptedMessages = (data || []).map(message => ({
        ...message,
        content: MessageEncryption.decryptMessage(message.content)
      }))
      
      if (reset) {
        // Reset messages for new conversation
        setMessages(decryptedMessages)
      } else {
        // Append messages for pagination
        setMessages(prev => [...decryptedMessages, ...prev])
      }

      // Check if there are more messages to load
      setHasMore((data?.length || 0) === MESSAGES_PER_PAGE && (offset + MESSAGES_PER_PAGE) < (count || 0))

    } catch (error: unknown) {
      console.error('Error loading messages:', error)
      setError('Failed to load messages')
    } finally {
      setLoadingMore(false)
    }
  }

  // Load more messages (for pagination)
  const loadMoreMessages = async () => {
    if (!selectedConversation || loadingMore || !hasMore) return

    const nextPage = page + 1
    setPage(nextPage) // set next page number
    await loadMessages(selectedConversation.id, nextPage, false) // recalculate message offset
  }

  // Scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Handle conversation selection
  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation)
  }

  // Create new conversation
  const createNewConversation = async () => {
    if (!user) return

    try {
      console.log('Creating new conversation')
      
      // insert new record into 'Conversations' table
      const { data, error } = await supabase
        .from('Conversations')
        .insert({
          user_id: user.id,
          conversation_topic: 'New Conversation', // This will be updated after first message
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      
      // Reload conversations and select the new one
      await loadConversations()
      if (data) {
        handleConversationSelect(data)
      }
    } catch (error: unknown) {
      console.error('Error creating conversation:', error)
      setError('Failed to create new conversation')
    }
  }

  // Update conversation topic with first message
  const updateConversationTopic = async (conversationId: string, firstMessage: string) => {
    try {
      // Truncate the message to a reasonable length for the topic
      const topic = firstMessage.length > 50 ? firstMessage.substring(0, 47) + '...' : firstMessage
      
      const { error } = await supabase
        .from('Conversations')
        .update({ conversation_topic: topic })
        .eq('id', conversationId)

      if (error) throw error
      
      // Reload conversations to show updated topic
      await loadConversations()
    } catch (error: unknown) {
      console.error('Error updating conversation topic:', error)
    }
  }

  // Handle conversation deletion
  const handleDeleteConversation = (conversation: Conversation) => {
    setConversationToDelete(conversation)
    setShowDeleteDialog(true)
  }

  // Confirm and execute conversation deletion
  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return

    try {
      // Delete all messages in the conversation first
      const { error: messagesError } = await supabase
        .from('Messages')
        .delete()
        .eq('conversation_id', conversationToDelete.id)

      if (messagesError) throw messagesError

      // Then delete the conversation
      const { error: conversationError } = await supabase
        .from('Conversations')
        .delete()
        .eq('id', conversationToDelete.id)

      if (conversationError) throw conversationError

      // Clear selected conversation if it was the one deleted
      if (selectedConversation?.id === conversationToDelete.id) {
        setSelectedConversation(null)
        setMessages([])
      }

      // Reload conversations
      await loadConversations()
      
    } catch (error: unknown) {
      console.error('Error deleting conversation:', error)
      setError('Failed to delete conversation')
    }
  }

  // Handle new message sent
  const handleMessageSent = (message: Message) => {
    // Add message to local state (already decrypted from MessageInput)
    setMessages(prev => [...prev, message])
    
    // Scroll to bottom after a short delay to ensure DOM is updated
    setTimeout(scrollToBottom, 100)
  }

  // Handle AI typing state
  const handleAiTypingStart = () => {
    setAiTyping(true)
  }

  const handleAiTypingStop = () => {
    setAiTyping(false)
  }

  // Handle first message to update conversation topic
  const handleFirstMessage = (firstMessage: string) => {
    if (selectedConversation) {
      updateConversationTopic(selectedConversation.id, firstMessage)
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
                  onClick={signOut}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Sign out
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
                      {/* For each Conversation record, create a button */}
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
                    {/* Conversation Header */}
                    <div className="p-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {selectedConversation.conversation_topic}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Created {new Date(selectedConversation.created_at).toLocaleDateString()}
                      </p>
                      {totalMessages > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {totalMessages} message{totalMessages !== 1 ? 's' : ''} total
                        </p>
                      )}
                    </div>

                    {/* Messages Area */}
                    <div 
                      ref={messagesContainerRef}
                      className="flex-1 overflow-y-auto p-4 space-y-4"
                    >
                      {/* Load More Button */}
                      {hasMore && (
                        <div className="flex justify-center">
                          <button
                            onClick={loadMoreMessages}
                            disabled={loadingMore}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingMore ? (
                              <div className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                                Loading more messages...
                              </div>
                            ) : (
                              'Load more messages'
                            )}
                          </button>
                        </div>
                      )}

                      {messages.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          No messages yet. Start the conversation!
                        </div>
                      ) : (
                        <>
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${
                                message.sender === 'user' ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  message.sender === 'user'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-200 text-gray-900'
                                }`}
                              >
                                <div className="text-sm">{message.content}</div>
                                <div
                                  className={`text-xs mt-1 ${
                                    message.sender === 'user'
                                      ? 'text-indigo-200'
                                      : 'text-gray-500'
                                  }`}
                                >
                                  {new Date(message.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* AI Typing Indicator */}
                          {aiTyping && (
                            <div className="flex items-center space-x-2 mb-4">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                              <span className="text-sm text-gray-600">Chad is typing...</span>
                            </div>
                          )}
                        </>
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