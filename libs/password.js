import bcrypt from 'bcryptjs'
import { logError } from './logger'

const SALT_ROUNDS = 12

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export async function hashPassword(password) {
  try {
    const hashed = await bcrypt.hash(password, SALT_ROUNDS)
    return hashed
  } catch (error) {
    logError('Password hashing error', error)
    throw new Error('Failed to hash password')
  }
}

/**
 * Verify a password against a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} - True if password matches
 */
export async function verifyPassword(password, hash) {
  try {
    if (!hash) {
      return false
    }
    const isValid = await bcrypt.compare(password, hash)
    return isValid
  } catch (error) {
    logError('Password verification error', error)
    return false
  }
}

