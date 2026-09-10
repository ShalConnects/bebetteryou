import mongoose from 'mongoose'
import { mongoUri } from './mongo-uri'

export { mongoUri }

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

export async function connectDB() {
  const uri = mongoUri()
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
  }

  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 8_000,
        connectTimeoutMS: 8_000,
      })
      .then((m) => m)
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default connectDB
