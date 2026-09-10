export function adminEmail() {
  return (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
}

export function isOwnerEmail(email) {
  const admin = adminEmail()
  return Boolean(admin && email?.toLowerCase().trim() === admin)
}

export function isAdminUser(user) {
  if (!user) return false
  if (user.owner || user.id === 'admin-owner') return true
  return isOwnerEmail(user.email)
}
