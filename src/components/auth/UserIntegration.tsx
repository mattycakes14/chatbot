'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface UserIntegrationProps {
  onClose?: () => void
  pendingServices: string[]
  email: string
  user_id: string
}

export default function UserIntegration({ onClose, email, user_id, pendingServices }: UserIntegrationProps) {    
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    setServices(pendingServices)
    setLoading(false)
  }, [])

  // switch case for rendering the service icon
  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'spotify':
        return '🎵'
      case 'google_calendar':
        return '📅'
      case 'google_docs':
        return '📄'
      default:
        return '🔗'
    }
  }

  // switch case for rendering the service name
  const getServiceName = (service: string) => {
    switch (service) {
      case 'spotify':
        return 'Spotify'
      case 'googlecalendar':
        return 'Google Calendar'
      case 'googledocs':
        return 'Google Docs'
      default:
        return service
    }
  }

  // switch case for rendering the service description
  const getServiceDescription = (service: string) => {
    switch (service) {
      case 'spotify':
        return 'Connect your Spotify account to access your music preferences and playlists'
      case 'google_calendar':
        return 'Connect your Google Calendar to manage your schedule and events'
      case 'google_docs':
        return 'Connect your Google Docs to access and manage your documents'
      default:
        return 'Connect your account to enable this service'
    }
  }


  const handleAuthorize = async (service: string) => {
    console.log(`Authorizing ${service}...`)

    try {
      const response = await axios.post(`http://localhost:8000/auth/userintegrations/${service}`, {
        email: email,
        user_id: user_id,
      })
      console.log(response.data)
      
    } catch (error) {
      console.error(`Error authorizing ${service}:`, error)
    }
  }

  const handleSkip = () => {
    console.log(services)
    // if (onClose) {
    //   onClose()
    // } else {
    //   router.push('/chat')
    // }
  }

  const handleAuthorizeAll = () => {
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-center">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 border border-gray-200 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            Connect Your Services
          </h3>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <p className="text-gray-600 mb-6">
          To provide you with the best experience, please authorize the following services:
        </p>

        <div className="space-y-4 mb-6">
          {services.map((service) => (
            <div key={service} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="text-2xl mr-3">
                {getServiceIcon(service)}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">
                  {getServiceName(service)}
                </h4>
                <p className="text-sm text-gray-500">
                  {getServiceDescription(service)}
                </p>
              </div>
              <button
                onClick={() => handleAuthorize(service)}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors"
              >
                Connect
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleAuthorizeAll}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Complete Integration
          </button>
        </div>
      </div>
    </div>
  )
}