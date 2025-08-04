'use client'

import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Conversation, Message } from '@/lib/database'
import MessageInput from '@/components/chat/MessageInput'

export default function ChatPage() {
  const { user, signOut } = useAuth() // handles user auth session
  const [conversations, setConversations] = useState<Conversation[]>([]) // conversations state
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null) // selected conversation state
  const [messages, setMessages] = useState<Message[]>([]) // messages state
  const [loading, setLoading] = useState(true) // loading state
  const [error, setError] = useState<string | null>(null) // error state
  const supabase = createClient() // supabase client

  // Load user's conversations
  useEffect(() => {
    if (user) {
      loadConversations()
    }
  }, [user])

  // on change of user, load conversations
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

    } catch (error: any) {
      console.error('Error loading conversations:', error)
      setError('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  // Load messages for selected conversation
  const loadMessages = async (conversationId: string) => {
    try {
      // fetch every message and column for correspond conversation_id
      const { data, error } = await supabase
        .from('Messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true })

      if (error) throw error
      
      // set state for messages from data
      setMessages(data || [])

    } catch (error: any) {
      console.error('Error loading messages:', error)
      setError('Failed to load messages')
    }
  }

  // Handle conversation selection
  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    loadMessages(conversation.id)
  }

  // Create new conversation
  const createNewConversation = async () => {
    console.log('Creating new conversation')

    if (!user) return

    try {
      // insert new record into 'Conversations' table
      const { data, error } = await supabase
        .from('Conversations')
        .insert({
          user_id: user.id,
          conversation_topic: 'New Conversation',
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
    } catch (error: any) {
      console.error('Error creating conversation:', error)
      setError('Failed to create new conversation')
    }
  }

  // Handle new message sent (passed down to MessageInput component)
  const handleMessageSent = (message: Message) => {
    setMessages(prev => [...prev, message])
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
                        <button
                          key={conversation.id}
                          onClick={() => handleConversationSelect(conversation)}
                          className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                            selectedConversation?.id === conversation.id
                              ? 'bg-indigo-50 border-r-2 border-indigo-600'
                              : ''
                          }`}
                        >
                          <div className="font-medium text-gray-900 truncate">
                            {conversation.conversation_topic}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(conversation.created_at).toLocaleDateString()}
                          </div>
                        </button>
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
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          No messages yet. Start the conversation!
                        </div>
                      ) : (
                        messages.map((message) => (
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
                        ))
                      )}
                    </div>

                    {/* Message Input */}
                    <MessageInput
                      conversationId={selectedConversation.id}
                      onMessageSent={handleMessageSent}
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
      </div>
    </ProtectedRoute>
  )
} 