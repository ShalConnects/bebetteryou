/** Atlas copy-paste tokens — not a real password that happens to include `<` `>`. */
const PLACEHOLDER = /<(db_password|password|user|username|dbname)>/i
const WRAPPED_PASS = /^<([^<>]+)>$/
const DEFAULT_DB = 'be-better-you'

/** Empty when unset or still an Atlas template (`<db_password>`). */
export function mongoUri() {
  const uri = (process.env.MONGODB_URI || '').trim()
  if (!uri || PLACEHOLDER.test(uri)) return ''
  return withDefaultDb(encodeMongoPassword(uri))
}

/** `<` `>` `@` in a password must be percent-encoded or the URI parser splits it. */
function encodeMongoPassword(uri) {
  const at = uri.lastIndexOf('@')
  const proto = uri.indexOf('://')
  if (at < 0 || proto < 0) return uri
  const start = proto + 3
  const userinfo = uri.slice(start, at)
  const colon = userinfo.indexOf(':')
  if (colon < 0) return uri
  const user = userinfo.slice(0, colon)
  const pass = userinfo.slice(colon + 1)
  let decoded = pass
  try {
    decoded = decodeURIComponent(pass)
  } catch {
    decoded = pass
  }
  const wrapped = decoded.match(WRAPPED_PASS)
  if (wrapped && !PLACEHOLDER.test(decoded)) decoded = wrapped[1]
  return `${uri.slice(0, start)}${user}:${encodeURIComponent(decoded)}${uri.slice(at)}`
}

/** Atlas UI omits the db name; mongoose then opens empty `test`. */
function withDefaultDb(uri) {
  const at = uri.lastIndexOf('@')
  if (at < 0) return uri
  const after = uri.slice(at + 1)
  const q = after.indexOf('?')
  const hostAndPath = q < 0 ? after : after.slice(0, q)
  const query = q < 0 ? '' : after.slice(q)
  const slash = hostAndPath.indexOf('/')
  const host = slash < 0 ? hostAndPath : hostAndPath.slice(0, slash)
  const db = slash < 0 ? '' : hostAndPath.slice(slash + 1)
  if (db) return uri
  return `${uri.slice(0, at + 1)}${host}/${DEFAULT_DB}${query}`
}
