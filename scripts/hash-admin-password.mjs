import bcrypt from 'bcryptjs'

const pwd = process.argv[2]
if (!pwd) {
  console.error('Usage: npm run hash:admin -- <password>')
  process.exit(1)
}

const hash = await bcrypt.hash(pwd, 12)
const escaped = hash.replaceAll('$', '\\$')
console.log(hash)
console.log(
  `\nPaste into .env.local (escape $ so Next.js does not wipe the hash):\nADMIN_PASSWORD_HASH=${escaped}`
)
