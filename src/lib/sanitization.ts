// Input sanitization utility to prevent XSS and other attacks

export class InputSanitizer {
  // Remove potentially dangerous HTML tags and attributes
  static sanitizeHTML(input: string): string {
    if (!input) return input

    // Remove script tags and their content
    let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    
    // Remove other potentially dangerous tags
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    sanitized = sanitized.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    
    // Remove dangerous attributes
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '') // onclick, onload, etc.
    sanitized = sanitized.replace(/\s*javascript\s*:/gi, '') // javascript: protocol
    sanitized = sanitized.replace(/\s*data\s*:/gi, '') // data: protocol
    
    // Remove excessive whitespace and normalize
    sanitized = sanitized.replace(/\s+/g, ' ').trim()
    
    return sanitized
  }

  // Validate message length
  static validateMessageLength(content: string, maxLength: number = 10000): boolean {
    return content.length <= maxLength
  }

  // Check for potentially harmful content patterns
  static detectHarmfulContent(content: string): boolean {
    const harmfulPatterns = [
      /<script/i,
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /document\./i,
      /window\./i,
      /localStorage\./i,
      /sessionStorage\./i
    ]

    return harmfulPatterns.some(pattern => pattern.test(content))
  }

  // Comprehensive message validation
  static validateMessage(content: string): { isValid: boolean; error?: string } {
    if (!content || content.trim().length === 0) {
      return { isValid: false, error: 'Message cannot be empty' }
    }

    if (content.length > 10000) {
      return { isValid: false, error: 'Message too long (max 10,000 characters)' }
    }

    if (this.detectHarmfulContent(content)) {
      return { isValid: false, error: 'Message contains potentially harmful content' }
    }

    return { isValid: true }
  }

  // Sanitize and validate message
  static sanitizeAndValidate(content: string): { 
    sanitized: string; 
    isValid: boolean; 
    error?: string 
  } {
    const sanitized = this.sanitizeHTML(content)
    const validation = this.validateMessage(sanitized)
    
    return {
      sanitized,
      isValid: validation.isValid,
      error: validation.error
    }
  }
} 