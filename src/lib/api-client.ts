// Secure API client for frontend
export const apiClient = {
  async getConversations() {
    const response = await fetch('/api/conversations')
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch conversations')
    }
    return response.json()
  },

  async createConversation(topic: string) {
    const response = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create conversation')
    }
    return response.json()
  },

  async getMessages(conversationId: string, page: number = 1, limit: number = 50) {
    const params = new URLSearchParams({
      conversationId,
      page: page.toString(),
      limit: limit.toString()
    })
    
    const response = await fetch(`/api/messages?${params}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch messages')
    }
    return response.json()
  },

  async addMessage(conversationId: string, content: string, sender: string) {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, content, sender })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to add message')
    }
    return response.json()
  },

  async deleteConversation(conversationId: string) {
    const response = await fetch(`/api/conversations/${conversationId}`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete conversation')
    }
    return response.json()
  },

  async updateConversationTopic(conversationId: string, topic: string) {
    const response = await fetch(`/api/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update conversation topic')
    }
    return response.json()
  },

  async sendChatMessage(conversationId: string, message: string, context?: string) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, message, context })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get LLM response')
    }
    return response.json()
  }
}
