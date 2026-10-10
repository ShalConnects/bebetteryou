/**
 * @jest-environment node
 */
import {
  normalizeResendWebhookEvent,
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

  it('parses Name <email> recipients', () => {
    expect(recipientFromResendData({ to: ['Alice <Alice@Ex.COM>'] })).toBe('alice@ex.com')
  })

  it('reads email / recipient fallbacks', () => {
    expect(recipientFromResendData({ email: 'x@y.com' })).toBe('x@y.com')
    expect(recipientFromResendData({ recipient: 'z@y.com' })).toBe('z@y.com')
  })

  it('returns empty when missing', () => {
    expect(recipientFromResendData({})).toBe('')
    expect(recipientFromResendData(null)).toBe('')
  })

  it('unwraps nested payload envelopes', () => {
    expect(
      normalizeResendWebhookEvent({
        payload: { type: 'email.bounced', data: { to: ['a@b.com'] } },
      })
    ).toEqual({ type: 'email.bounced', data: { to: ['a@b.com'] } })
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

  it('resolves type from a wrapped payload', () => {
    expect(
      resolveResendEventType({
        payload: {
          type: 'email.bounced',
          data: { to: ['a@b.com'], bounce: { type: 'Permanent' } },
        },
      })
    ).toBe('email.bounced')
  })

  it('reads nested data via resendEventData', () => {
    expect(resendEventData({ data: { to: ['x@y.com'] } }).to).toEqual(['x@y.com'])
    expect(
      resendEventData({ payload: { type: 'email.bounced', data: { to: ['x@y.com'] } } }).to
    ).toEqual(['x@y.com'])
  })
})
