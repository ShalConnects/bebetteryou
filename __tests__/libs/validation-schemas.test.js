import {
  createLeadSchema,
  createCheckoutSessionSchema,
  emailOnlySchema,
  registerSchema,
  magicLinkSchema,
  validateSchema,
} from '@/libs/validation-schemas'

describe('Validation Schemas', () => {
  describe('createLeadSchema', () => {
    it('should validate a valid lead', () => {
      const result = validateSchema(createLeadSchema, {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'This is a test message',
      })
      expect(result.success).toBe(true)
      expect(result.data.email).toBe('john@example.com')
    })

    it('should reject missing required fields', () => {
      const result = validateSchema(createLeadSchema, {
        name: 'John Doe',
        message: 'This is a test message',
      })
      expect(result.success).toBe(false)
      expect(result.error.details.length).toBeGreaterThan(0)
    })

    it('should reject invalid email format', () => {
      const result = validateSchema(createLeadSchema, {
        name: 'John Doe',
        email: 'not-an-email',
        message: 'This is a test message',
      })
      expect(result.success).toBe(false)
    })

    it('should trim and lowercase email', () => {
      const result = validateSchema(createLeadSchema, {
        name: 'John Doe',
        email: '  JOHN@EXAMPLE.COM  ',
        message: 'This is a test message',
      })
      expect(result.success).toBe(true)
      expect(result.data.email).toBe('john@example.com')
    })

    it('should enforce max length constraints', () => {
      const result = validateSchema(createLeadSchema, {
        name: 'A'.repeat(101),
        email: 'john@example.com',
        message: 'This is a test message',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('emailOnlySchema', () => {
    it('should validate newsletter signup email', () => {
      const result = validateSchema(emailOnlySchema, { email: '  JOIN@EXAMPLE.COM  ' })
      expect(result.success).toBe(true)
      expect(result.data.email).toBe('join@example.com')
    })

    it('should reject missing email', () => {
      expect(validateSchema(emailOnlySchema, {}).success).toBe(false)
    })
  })

  describe('createCheckoutSessionSchema', () => {
    it('should validate a valid Stripe price ID', () => {
      const result = validateSchema(createCheckoutSessionSchema, {
        priceId: 'price_1234567890abcdef',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid price ID format', () => {
      const result = validateSchema(createCheckoutSessionSchema, {
        priceId: 'invalid-price-id',
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing priceId', () => {
      const result = validateSchema(createCheckoutSessionSchema, {})
      expect(result.success).toBe(false)
    })
  })

  describe('registerSchema', () => {
    it('should validate registration payload', () => {
      const result = validateSchema(registerSchema, {
        name: 'Ada',
        email: 'ADA@EXAMPLE.COM',
        password: 'password1',
      })
      expect(result.success).toBe(true)
      expect(result.data.email).toBe('ada@example.com')
    })

    it('should reject short passwords', () => {
      const result = validateSchema(registerSchema, {
        name: 'Ada',
        email: 'ada@example.com',
        password: 'short',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('magicLinkSchema', () => {
    it('should validate email', () => {
      const result = validateSchema(magicLinkSchema, { email: '  User@Example.com ' })
      expect(result.success).toBe(true)
      expect(result.data.email).toBe('user@example.com')
    })
  })
})
