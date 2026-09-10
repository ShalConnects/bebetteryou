/** Empty when unset or still an Atlas copy-paste placeholder (`<db_password>`). */
export function mongoUri() {
  const uri = (process.env.MONGODB_URI || '').trim()
  return uri && !/<[^>]*>/.test(uri) ? uri : ''
}
