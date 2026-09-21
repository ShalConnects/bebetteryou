/**
 * @jest-environment node
 */
import {
  recipientFromResendData,
  resolveResendEventType,
  resendEventData,
} from '@/libs/resend-webhook-parse'

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

  it('resolves type from event.type', () => {
    expect(resolveResendEventType({ type: 'email.bounced', data: {} })).toBe('email.bounced')
    expect(resolveResendEventType({ type: 'email.complained', data: {} })).toBe('email.complained')
  })

  it('infers bounced when type is missing but data.bounce exists', () => {
    expect(
      resolveResendEventType({
        created_at: '2026-09-20T23:33:02.771Z',
        data: { bounce: { type: 'Permanent', message: 'nope' }, to: ['a@b.com'] },
      })
    ).toBe('email.bounced')
  })

  it('reads nested data via resendEventData', () => {
    expect(resendEventData({ data: { to: ['x@y.com'] } }).to).toEqual(['x@y.com'])
  })
})
