'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import UserIntegration from './UserIntegration'

type LoginFormProps = {
  variant?: 'full' | 'card'
  disableIntegrationsFlow?: boolean
}

export default function LoginForm({
  variant = 'full',
  disableIntegrationsFlow = false,
}: LoginFormProps) {
  const [email, setEmail] = useState('') // email input
  const [password, setPassword] = useState('') // password input
  const [loading, setLoading] = useState(false) // loading state
  const [error, setError] = useState<string | null>(null) // error state
  const [isSignUp, setIsSignUp] = useState(false) // sign up state
  const [emailError, setEmailError] = useState<string | null>(null) // email validation error
  const router = useRouter() // router
  const supabase = createClient() // supabase client
  const [showAuthPopup, setShowAuthPopup] = useState(false) // authorization popup state
  const [user_id, setUserId] = useState('') // user id
  const [pendingServices, setPendingServices] = useState<string[]>([]) // pending services
  
  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Handle email input change with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    
    // Clear previous errors when user starts typing
    if (error) setError(null)
    
    // Validate email format
    if (value && !validateEmail(value)) {
      setEmailError('Please enter a valid email address')
    } else {
      setEmailError(null)
    }
  }

  // Check if form is valid
  const isFormValid = () => {
    return email && password && !emailError && validateEmail(email)
  }
  
  // handle login or signup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Additional validation before submission
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address')
      return
    }
    
    setLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        // First create the user in Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        
        // Then create the user record in your custom Users table
        if (data.user) {
          const { error: profileError } = await supabase
            .from('Users') // Your existing Users table
            .insert({
              id: data.user.id,
              email: data.user.email,
              created_at: new Date().toISOString(),
            })
          
          if (profileError) {
            console.error('Error creating user profile:', profileError)
            setError(`User created in Auth but failed to create profile: ${profileError.message}`)
            return
          }

          if (!disableIntegrationsFlow) {
            // insert pre-fill user integrations until authentication is complete
            const services = ["spotify", "googlecalendar", "googledocs"]
            const { error: integrationsError } = await supabase.from('user_integrations').insert(
              services.map(service => ({
                email: email,
                created_at: new Date().toISOString(),
                auth_id: null,
                service_name: service,
                status: 'pending',
                updated_at: new Date().toISOString()
              })) 
            )
            
            if (integrationsError) {
              console.error('Error creating user integrations:', integrationsError)
              setError(`User profile created but failed to create integrations: ${integrationsError.message}`)
              return
            }
          }
        }
        
        alert('Check your email for the confirmation link!')
      } else {
        // Login handled via Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
          setUserId(data.user?.id)
        if (disableIntegrationsFlow) {
          router.push('/chat')
        } else {
          try {
            const response = await axios.post("https://langchain-agent-backend-production.up.railway.app/auth/userintegrations", {
              email: data.user?.email,
            })
            if (response.data.status === "pending") {
              setPendingServices(response.data.pending_services)
              setShowAuthPopup(true)
            } else {
              router.push('/chat')
            }
          } catch (error) {
            console.error('Error logging in:', error)
          }
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (showAuthPopup) {
    return (
      <UserIntegration onClose={() => setShowAuthPopup(false)} email={email} pendingServices={pendingServices} />
    )
  }

  const content = (
    <div className="w-full space-y-6">
      <div className="text-center">
        <p className="text-slate-600">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
      
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="email-address" className="block text-sm font-medium text-slate-700 mb-2">
              Email address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-slate-400 ${
                emailError 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'hover:border-slate-300'
              }`}
              placeholder="Enter your email"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => {
                if (email && !validateEmail(email)) {
                  setEmailError('Please enter a valid email address')
                }
              }}
            />
            {emailError && (
              <p className="text-red-500 text-sm mt-1">{emailError}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-slate-400 hover:border-slate-300"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !isFormValid()}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-lg"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
              {isSignUp ? 'Creating account...' : 'Signing in...'}
            </div>
          ) : (
            isSignUp ? 'Create Account' : 'Sign In'
          )}
        </button>
      </form>
    </div>
  )

  if (variant === 'card') {
    return content
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8">
        {content}
      </div>
    </div>
  )
}