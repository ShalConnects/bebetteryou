import { cleanReason, fixTypoDomain } from '@/libs/shal-outreach/clean'

describe('outreach cleanReason', () => {
  it('skips personal, typo, throwaway and invalid addresses', () => {
    expect(cleanReason('lk_cook@yahoo.com')).toBe('personal-mailbox')
    expect(cleanReason('bheath@bigpond.net.au')).toBe('personal-mailbox')
    expect(cleanReason('adamsf1@tiscali.co.uk')).toBe('personal-mailbox')
    expect(cleanReason('owner@shop.con')).toBe('typo-domain')
    expect(cleanReason('x@mailinator.com')).toBe('disposable')
    expect(cleanReason('not-an-email')).toBe('invalid')
  })

  it('skips ISP subdomains and schools, universities, government and the NHS', () => {
    expect(cleanReason('a@tx.rr.com')).toBe('personal-mailbox')
    expect(cleanReason('a@poczta.onet.pl')).toBe('personal-mailbox')
    expect(cleanReason('a@gmail.com.au')).toBe('personal-mailbox')
    expect(cleanReason('a@suddenlink.net')).toBe('personal-mailbox')
    for (const d of ['osu.edu', 'kingston.ac.uk', 'connect.qut.edu.au', 'nhs.net', 'ddg64.navy.mil', 'x.gov.uk']) {
      expect(cleanReason(`a@${d}`)).toBe('institution')
    }
  })

  it('keeps business domains', () => {
    expect(cleanReason('owner@paddyrankin.co.uk')).toBe('')
    expect(cleanReason('info@alliedprograms.com.au')).toBe('')
    expect(cleanReason('hi@hudsonplatingworks.com')).toBe('')
    expect(cleanReason('hi@shop.live')).toBe('')
  })

  it('fixes typo top-level domains to .com', () => {
    expect(fixTypoDomain('owner@shop.con')).toBe('owner@shop.com')
    expect(fixTypoDomain('owner@shop.co.uk')).toBe('owner@shop.co.uk')
  })
})
