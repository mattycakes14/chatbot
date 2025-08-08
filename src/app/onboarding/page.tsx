'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'

export default function OnboardingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [loadingAction, setLoadingAction] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null
  }

  const steps = [
    {
      title: "Welcome to Chat with Vivian Tran! 👋",
      description: "Meet your AI companion who's here to chat, help, and keep you company.",
      content: (
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            VT
          </div>
          <p className="text-gray-600">
            Vivian Tran is your friendly AI assistant with a personality inspired by Southern California culture.
          </p>
        </div>
      )
    },
    {
      title: "What can Vivian help you with?",
      description: "From casual conversation to getting advice, Vivian is here for you.",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">💬 Casual Chat</h3>
              <p className="text-sm text-blue-700">Have friendly conversations about anything on your mind</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">🎯 Advice & Help</h3>
              <p className="text-sm text-green-700">Get guidance on various topics and questions</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-2">🌟 Entertainment</h3>
              <p className="text-sm text-purple-700">Share jokes, stories, and fun conversations</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-semibold text-orange-800 mb-2">🤝 Support</h3>
              <p className="text-sm text-orange-700">Someone to talk to when you need it</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "How to get started",
      description: "It's simple! Just start typing and Vivian will respond.",
      content: (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">1. Create a Conversation</h3>
            <p className="text-sm text-gray-600">Click "New Conversation" to start chatting</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">2. Type Your Message</h3>
            <p className="text-sm text-gray-600">Just type naturally - Vivian understands casual conversation</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">3. Get Vivian's Response</h3>
            <p className="text-sm text-gray-600">Vivian will respond with her unique personality and style</p>
          </div>
        </div>
      )
    },
    {
      title: "Ready to start chatting?",
      description: "Your conversations are private and secure. Let's get started!",
      content: (
        <div className="text-center space-y-4">
          <div className="bg-gradient-to-r from-pink-400 to-purple-500 p-6 rounded-lg text-white">
            <h3 className="text-xl font-bold mb-2">Start Your First Conversation</h3>
            <p className="text-pink-100">
              Click the button below to begin chatting with Vivian Tran!
            </p>
          </div>
        </div>
      )
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleStartChatting()
    }
  }

  const handleStartChatting = async () => {
    setLoadingAction(true)
    try {
      // Create a new conversation for the user
      const { conversation } = await apiClient.createConversation('My First Chat with Vivian')
      
      // Redirect to the chat page with the new conversation
      router.push('/chat')
    } catch (error) {
      console.error('Error creating conversation:', error)
      // Still redirect to chat page even if conversation creation fails
      router.push('/chat')
    } finally {
      setLoadingAction(false)
    }
  }

  const handleSkip = () => {
    router.push('/chat')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-semibold text-gray-900">Welcome to Chat</h1>
            <button
              onClick={handleSkip}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Skip Onboarding
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-sm text-gray-600">
                {Math.round(((currentStep + 1) / steps.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-pink-400 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Step Content */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {steps[currentStep].title}
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              {steps[currentStep].description}
            </p>
            
            <div className="max-w-2xl mx-auto">
              {steps[currentStep].content}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <button
              onClick={handleNext}
              disabled={loadingAction}
              className="px-8 py-3 bg-gradient-to-r from-pink-400 to-purple-500 text-white rounded-lg hover:from-pink-500 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
            >
              {loadingAction ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating conversation...</span>
                </div>
              ) : currentStep === steps.length - 1 ? (
                'Start Chatting!'
              ) : (
                'Next'
              )}
            </button>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Quick Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start space-x-2">
              <span className="text-purple-500">•</span>
              <span>Be yourself - Vivian loves authentic conversations</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-purple-500">•</span>
              <span>Ask questions - Vivian is knowledgeable and helpful</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-purple-500">•</span>
              <span>Share your interests - Vivian loves learning about you</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 