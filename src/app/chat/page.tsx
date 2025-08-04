'use client'

import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

export default function ChatPage() {
  const { user, signOut } = useAuth()

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-4">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="border-b border-gray-200 p-4">
              <div className="flex justify-between items-center">
                <h1 className="text-xl font-semibold text-gray-900">Chat with AI</h1>
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
            <div className="p-4">
              <div className="text-center text-gray-500">
                Chat interface coming soon...
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
} 