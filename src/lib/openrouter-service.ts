// OpenRouter Service - Access multiple LLM models through a single API

export interface OpenRouterConfig {
  apiKey: string
  baseUrl?: string
}

export interface OpenRouterResponse {
  content: string
  error?: string
  model?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class OpenRouterService {
  private config: OpenRouterConfig
  private baseUrl: string

  constructor(config: OpenRouterConfig) {
    this.config = config
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1'
  }

  async getAvailableModels() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`)
      }

      const data = await response.json()
      return data.data || []
    } catch (error: unknown) {
      console.error('Error fetching OpenRouter models:', error)
      return []
    }
  }

  // Call OpenRouter API with any model
  async callOpenRouter(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    model: string = 'openai/gpt-3.5-turbo'
  ): Promise<OpenRouterResponse> {
    try {
      // Check if API key is configured
      if (!this.config.apiKey) {
        throw new Error('OpenRouter API key is not configured')
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Chatbot App',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 1000,
          temperature: 0.9,
          stream: false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error?.message || 'Unknown error'
        
        // Provide more specific error messages
        if (response.status === 401) {
          throw new Error(`Authentication failed: ${errorMessage}. Please check your API key.`)
        } else if (response.status === 403) {
          throw new Error(`Access denied: ${errorMessage}. Please check your API key permissions.`)
        } else if (response.status === 429) {
          throw new Error(`Rate limit exceeded: ${errorMessage}. Please try again later.`)
        } else {
          throw new Error(`OpenRouter API error: ${response.status} - ${errorMessage}`)
        }
      }

      const data = await response.json()
      return {
        content: data.choices[0]?.message?.content || 'No response from AI',
        model: data.model,
        usage: data.usage,
      }
    } catch (error: unknown) {
      console.error('OpenRouter API error:', error)
      return {
        content: 'Sorry, I encountered an error. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Popular model shortcuts
  async callGPT35(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) {
    return this.callOpenRouter(messages, 'openai/gpt-3.5-turbo')
  }

  async callGPT4(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) {
    return this.callOpenRouter(messages, 'openai/gpt-4')
  }

  async callClaude(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) {
    return this.callOpenRouter(messages, 'anthropic/claude-3-sonnet')
  }

  async callGemini(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) {
    return this.callOpenRouter(messages, 'google/gemini-pro')
  }

  async callLlama(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) {
    return this.callOpenRouter(messages, 'meta-llama/llama-2-70b-chat')
  }

  // Mock response for development/testing
  async getMockResponse(_userMessage: string): Promise<OpenRouterResponse> {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const responses = [
      "I understand you're asking about that. Let me help you with that.",
      "That's an interesting question! Here's what I think about it...",
      "I'd be happy to help you with that. Let me provide some information.",
      "Thanks for sharing that with me. I have some thoughts on this topic.",
      "I see what you're getting at. Let me break this down for you."
    ]
    
    return {
      content: responses[Math.floor(Math.random() * responses.length)],
      model: 'mock/response'
    }
  }

  // Add this method to the OpenRouterService class
  async validateApiKey(): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        console.error('OpenRouter API key is not configured')
        return false
      }

      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error(`API key validation failed: ${response.status}`)
        return false
      }

      return true
    } catch (error) {
      console.error('Error validating API key:', error)
      return false
    }
  }
}

// Remove the old exposed service and replace with secure wrapper
// export const openRouterService = new OpenRouterService({
//   apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '',  // ← REMOVE THIS
// })

// Create a client-side wrapper that calls the secure API route
export const openRouterService = {
  async callGPT35(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) {
    return this.callGPT4(messages) // Use GPT-4 for now
  },

  async callGPT4(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get AI response')
      }

      return response.json()
    } catch (error: any) {
      console.error('API call error:', error)
      return {
        content: 'Sorry, I encountered an error. Please try again.',
        error: error.message
      }
    }
  },

  async callClaude(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) {
    return this.callGPT4(messages) // Use GPT-4 for now
  },

  async callGemini(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) {
    return this.callGPT4(messages) // Use GPT-4 for now
  },

  async callLlama(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) {
    return this.callGPT4(messages) // Use GPT-4 for now
  }
} 