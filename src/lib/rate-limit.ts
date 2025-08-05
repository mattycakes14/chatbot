// rate limit for api requests

interface RateLimitConfig {
  interval: number
  uniqueTokenPerInterval: number
}

export function rateLimit(config: RateLimitConfig) {
  const tokens = new Map<string, number[]>()

  // Clean up old entries periodically
  setInterval(() => {
    const now = Date.now()
    const windowStart = now - config.interval
    
    for (const [key, timestamps] of tokens.entries()) {
      const validTokens = timestamps.filter(timestamp => timestamp > windowStart)
      if (validTokens.length === 0) {
        tokens.delete(key)
      } else {
        tokens.set(key, validTokens)
      }
    }
  }, config.interval)

  return {
    check: async (request: Request, limit: number, token: string) => {
      const ip = request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown'
      
      const key = `${ip}:${token}`
      const now = Date.now()
      const windowStart = now - config.interval

      const existingTokens = tokens.get(key) || []
      const validTokens = existingTokens.filter(timestamp => timestamp > windowStart)
      
      if (validTokens.length >= limit) {
        throw new Error('Rate limit exceeded')
      }
      
      validTokens.push(now)
      tokens.set(key, validTokens)
    }
  }
} 