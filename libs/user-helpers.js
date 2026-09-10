import { connectDB } from './mongo'
import User from '@/models/User'
import { hashPassword } from './password'
import { logError } from './logger'

/**
 * Shared entitlement update for Stripe / Lemon Squeezy webhooks
 */
export async function setUserAccess(filter, update) {
  try {
    await connectDB()
    return await User.findOneAndUpdate(filter, update, { new: true })
  } catch (error) {
    logError('setUserAccess failed', error)
    return null
  }
}

/**
 * Create a new user with email/password
 * @param {string} email - User email
 * @param {string} password - Plain text password
 * @param {string} name - User name
 * @returns {Promise<Object>} - Created user (without password)
 */
export async function createUserWithPassword(email, password, name) {
  try {
    await connectDB()

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() })
    if (existingUser) {
      throw new Error('User already exists')
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name || email.split('@')[0],
    })

    // Return user without password
    const userObj = user.toObject()
    delete userObj.password
    return userObj
  } catch (error) {
    logError('Error creating user with password', error)
    throw error
  }
}

/**
 * Update user password
 * @param {string} userId - User ID
 * @param {string} newPassword - New plain text password
 * @returns {Promise<Object>} - Updated user
 */
export async function updateUserPassword(userId, newPassword) {
  try {
    await connectDB()

    const hashedPassword = await hashPassword(newPassword)

    const user = await User.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true }
    ).select('-password')

    return user
  } catch (error) {
    logError('Error updating user password', error)
    throw error
  }
}

