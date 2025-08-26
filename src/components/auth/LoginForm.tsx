'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import UserIntegration from './UserIntegration'

export default function LoginForm() {
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

          // insert pre-fill user integrations until authentication is complete
          const services = ["spotify", "googlecalendar", "googledocs"]
          const { error: integrationsError } = await supabase.from('user_integrations').insert(
            services.map(service => ({
              user_id: data?.user?.id,
              created_at: new Date().toISOString(),
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
        
        alert('Check your email for the confirmation link!')
      } else {
        // Login handled via Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
          setUserId(data.user?.id)
        try {
          const response = await axios.post("http://localhost:8000/auth/userintegrations", {
            email: data.user?.email,
            user_id: data.user?.id,
          })
          if (response.data.status === "pending") {
            setPendingServices(response.data.pending_services)
            setShowAuthPopup(true)
          }
        } catch (error) {
          console.error('Error logging in:', error)
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
      <UserIntegration onClose={() => setShowAuthPopup(false)} email={email} user_id={user_id} pendingServices={pendingServices} />
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                  emailError 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300'
                }`}
                placeholder="Email address"
                value={email}
                onChange={handleEmailChange}
                onBlur={() => {
                  // Additional validation on blur
                  if (email && !validateEmail(email)) {
                    setEmailError('Please enter a valid email address')
                  }
                }}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Email validation error */}
          {emailError && (
            <div className="text-red-600 text-sm text-center">{emailError}</div>
          )}

          {/* General error */}
          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isSignUp ? 'Creating account...' : 'Signing in...'}
                </div>
              ) : (
                isSignUp ? 'Sign up' : 'Sign in'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}