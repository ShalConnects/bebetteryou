import { isValidEmail } from './letter.js'

/**
 * Free pre-clean: addresses that bounce or never reach a business owner. Personal mailboxes
 * (webmail and old ISP accounts) are where this list's bounces come from, and store owners
 * mostly mail from their own domain. Matched on any label but the last (tx.rr.com → rr, bigpond.net.au → bigpond).
 * Schools, universities, government and the NHS are skipped too: old staff and student mailboxes bounce.
 */
const PERSONAL = new Set(
  `gmail googlemail yahoo ymail rocketmail hotmail outlook live msn aol aim icloud me mac gmx web mail email
  inbox yandex ya rambler protonmail proton pm tutanota zohomail fastmail hushmail lycos excite netscape juno
  netzero earthlink comcast verizon att sbcglobal bellsouth cox charter optonline roadrunner rr frontier
  centurylink windstream embarqmail shaw rogers telus sympatico videotron bigpond optusnet internode dodo
  iinet tpg adam westnet ozemail iprimus aapt telstra xtra clear paradise vodafone tiscali btinternet
  btopenworld sky talktalk virginmedia virgin ntlworld blueyonder orange wanadoo free sfr laposte neuf
  libero alice tin virgilio tiscalinet interia wp o2 onet seznam centrum t-online freenet arcor
  suddenlink optimum midco mymts uwclub pipex amis citromail italymail op poczta gamil gmial hotmial`.split(/\s+/)
)
const DISPOSABLE = /^(mailinator|guerrillamail|10minutemail|tempmail|temp-mail|yopmail|trashmail|sharklasers|getnada|dispostable|maildrop|throwawaymail|fakeinbox)\./
const INSTITUTION = /\.(edu|mil|gov|sch\.[a-z]{2}|ac\.[a-z]{2}|edu\.[a-z]{2}|gov\.[a-z]{2})$|(^|\.)nhs\.(net|uk)$/
const BAD_TLD = /\.(con|cmo|comm|vom|xom|ocm|cpm|coom)$/

/** Why this address should be skipped, or '' to keep it. */
export function cleanReason(email) {
  const e = String(email || '').trim().toLowerCase()
  if (!isValidEmail(e)) return 'invalid'
  const domain = e.split('@')[1]
  if (BAD_TLD.test(domain)) return 'typo-domain'
  if (DISPOSABLE.test(domain)) return 'disposable'
  if (domain.split('.').slice(0, -1).some((l) => PERSONAL.has(l))) return 'personal-mailbox'
  if (INSTITUTION.test(domain)) return 'institution'
  return ''
}

/** `owner@shop.con` → `owner@shop.com`. */
export const fixTypoDomain = (email) => email.replace(BAD_TLD, '.com')

/** Stop reasons set by cleaning (and the send-time mail-server check), not by the person. */
export const CLEAN_REASONS = ['invalid', 'typo-domain', 'disposable', 'personal-mailbox', 'institution', 'no-mail-server']
