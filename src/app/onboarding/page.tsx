'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import LoginForm from '@/components/auth/LoginForm'

export default function OnboardingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/chat')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black/50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      {/* Full Background */}
      <div
        className="absolute inset-0 bg-cover bg-top"
        style={{ backgroundImage: "url('/backdrop.png')" }}
      />
      <div className="absolute inset-0 bg-black/70" />

      {/* ABG.AI Logo */}
      <div className="absolute top-6 left-6 z-20">
        <h1 className="text-white text-2xl font-bold tracking-wide">ABG.AI</h1>
      </div>

      {/* Content Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-end px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md mr-0 lg:mr-16">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h2>
              <p className="text-gray-600">Sign in or create your account</p>
            </div>
            <LoginForm variant="card" disableIntegrationsFlow={true} />
          </div>
        </div>
      </div>
    </div>
  )
}