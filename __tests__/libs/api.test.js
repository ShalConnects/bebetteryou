/**
 * @jest-environment node
 */
import { validateEmail, validateRequired, sanitizeInput, validateRequestBody } from '@/libs/api'

describe('API utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name@domain.co.uk')).toBe(true)
      expect(validateEmail('user+tag@example.com')).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      expect(validateEmail('not-an-email')).toBe(false)
      expect(validateEmail('missing@domain')).toBe(false)
      expect(validateEmail('@domain.com')).toBe(false)
      expect(validateEmail('user@')).toBe(false)
    })
  })

  describe('validateRequired', () => {
    it('should validate when all required fields are present', () => {
      const data = { name: 'John', email: 'john@example.com' }
      const result = validateRequired(data, ['name', 'email'])
      
      expect(result.isValid).toBe(true)
      expect(result.missing).toHaveLength(0)
    })

    it('should identify missing required fields', () => {
      const data = { name: 'John' }
      const result = validateRequired(data, ['name', 'email'])
      
      expect(result.isValid).toBe(false)
      expect(result.missing).toContain('email')
    })
  })

  describe('sanitizeInput', () => {
    it('should trim strings', () => {
      expect(sanitizeInput('  test  ')).toBe('test')
    })

    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World'
      const result = sanitizeInput(input)
      
      expect(result).not.toContain('<script>')
      expect(result).toContain('Hello')
      expect(result).toContain('World')
    })

    it('should return non-strings as-is', () => {
      expect(sanitizeInput(123)).toBe(123)
      expect(sanitizeInput(null)).toBe(null)
      expect(sanitizeInput({ key: 'value' })).toEqual({ key: 'value' })
    })
  })

  describe('validateRequestBody', () => {
    it('should validate when all required fields are present', () => {
      const body = { name: 'John', email: 'john@example.com' }
      const result = validateRequestBody(body, ['name', 'email'])
      
      expect(result.isValid).toBe(true)
      expect(result.missing).toHaveLength(0)
    })

    it('should identify missing, null, or empty fields', () => {
      const body1 = { name: 'John' }
      const body2 = { name: 'John', email: null }
      const body3 = { name: 'John', email: '' }
      
      expect(validateRequestBody(body1, ['name', 'email']).isValid).toBe(false)
      expect(validateRequestBody(body2, ['name', 'email']).isValid).toBe(false)
      expect(validateRequestBody(body3, ['name', 'email']).isValid).toBe(false)
    })
  })
})

