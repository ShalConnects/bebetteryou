import { cleanReason } from '@/libs/shal-outreach/clean'

describe('outreach cleanReason', () => {
  it('skips personal, typo, throwaway and invalid addresses', () => {
    expect(cleanReason('lk_cook@yahoo.com')).toBe('personal-mailbox')
    expect(cleanReason('bheath@bigpond.net.au')).toBe('personal-mailbox')
    expect(cleanReason('adamsf1@tiscali.co.uk')).toBe('personal-mailbox')
    expect(cleanReason('owner@shop.con')).toBe('typo-domain')
    expect(cleanReason('x@mailinator.com')).toBe('disposable')
    expect(cleanReason('not-an-email')).toBe('invalid')
  })

  it('keeps business domains', () => {
    expect(cleanReason('owner@paddyrankin.co.uk')).toBe('')
    expect(cleanReason('info@alliedprograms.com.au')).toBe('')
  })
})
