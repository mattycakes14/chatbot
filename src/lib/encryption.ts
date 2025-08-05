// Simple encryption utility for message content

export class MessageEncryption {
  private static readonly SECRET_KEY = process.env.SECRET_KEY // In production, use environment variable
  
  // Unicode-safe base64 encoding
  private static unicodeToBase64(str: string): string {
    return btoa(unescape(encodeURIComponent(str)))
  }
  
  // Unicode-safe base64 decoding
  private static base64ToUnicode(str: string): string {
    return decodeURIComponent(escape(atob(str)))
  }
  
  // Simple XOR encryption (not for production, but works for demo)
  static encryptMessage(content: string): string {
    try {
      if (!content) return content
      
      // Simple XOR encryption with the secret key
      let encrypted = ''
      for (let i = 0; i < content.length; i++) {
        const charCode = content.charCodeAt(i) ^ this.SECRET_KEY.charCodeAt(i % this.SECRET_KEY.length)
        encrypted += String.fromCharCode(charCode)
      }
      
      // Convert to base64 for safe storage (Unicode-safe)
      return this.unicodeToBase64(encrypted)
    } catch (error) {
      console.error('Encryption error:', error)
      return content // Fallback to original content
    }
  }

  static decryptMessage(encryptedContent: string): string {
    try {
      if (!encryptedContent) return encryptedContent
      
      // Convert from base64 (Unicode-safe)
      const encrypted = this.base64ToUnicode(encryptedContent)
      
      // Simple XOR decryption
      let decrypted = ''
      for (let i = 0; i < encrypted.length; i++) {
        const charCode = encrypted.charCodeAt(i) ^ this.SECRET_KEY.charCodeAt(i % this.SECRET_KEY.length)
        decrypted += String.fromCharCode(charCode)
      }
      
      return decrypted
    } catch (error) {
      console.error('Decryption error:', error)
      return encryptedContent // Fallback to original content
    }
  }
} 