/**
 * @jest-environment node
 */
import { recipientFromResendData } from '@/libs/resend-webhook-parse'

describe('resend webhook helpers', () => {
  it('reads the first recipient from to[]', () => {
    expect(recipientFromResendData({ to: ['A@Ex.COM', 'b@ex.com'] })).toBe('a@ex.com')
  })

  it('handles a bare string to', () => {
    expect(recipientFromResendData({ to: 'Person@Ex.com' })).toBe('person@ex.com')
  })

  it('returns empty when missing', () => {
    expect(recipientFromResendData({})).toBe('')
    expect(recipientFromResendData(null)).toBe('')
  })
})
