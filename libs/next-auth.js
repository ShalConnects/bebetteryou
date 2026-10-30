import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { adminEmail, isOwnerEmail } from '@/config/admin-auth'
import { ensureOwnerUser, matchOwnerPassword } from '@/libs/admin-user'
import { connectDB } from './mongo'
import User from '@/models/User'
import { logError } from './logger'
import { verifyPassword } from './password'
import { consumeMagicToken } from './magic-link'
import { clientIp, hit, rateLimitPresets } from './rate-limit'

const { limit, windowMs } = rateLimitPresets.strict
/** Brute-force guard: 10 tries per email and 30 per IP every 15 minutes. */
const loginLimited = async (email, req) =>
  (await hit(`login:${email}`, limit, windowMs)) || (await hit(`login:${clientIp(req)}`, limit * 3, windowMs))

function oauthProviders() {
  const list = []
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    list.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    )
  }
  if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
    list.push(
      GitHubProvider({
        clientId: process.env.GITHUB_ID,
        clientSecret: process.env.GITHUB_SECRET,
      })
    )
  }
  return list
}

export const authOptions = {
  providers: [
    ...oauthProviders(),
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        try {
          if (!credentials?.email || !credentials?.password) return null
          if (await loginLimited(credentials.email.toLowerCase().trim(), req)) return null
          if (isOwnerEmail(credentials.email)) {
            if (!(await matchOwnerPassword(credentials.password))) return null
            return await ensureOwnerUser()
          }
          await connectDB()
          const user = await User.findOne({ email: credentials.email.toLowerCase().trim() }).select(
            '+password'
          )
          if (!user?.password) return null
          if (!(await verifyPassword(credentials.password, user.password))) return null
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
            hasAccess: user.hasAccess,
          }
        } catch (error) {
          logError('Credentials authentication error', error)
          return null
        }
      },
    }),
    CredentialsProvider({
      id: 'magic-link',
      name: 'Magic Link',
      credentials: { token: { label: 'Token', type: 'text' } },
      async authorize(credentials) {
        try {
          const user = await consumeMagicToken(credentials?.token)
          if (!user) return null
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
            hasAccess: user.hasAccess,
          }
        } catch (error) {
          logError('Magic link authentication error', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user?.email) return false
      if (isOwnerEmail(user.email)) return true
      try {
        await connectDB()
        const email = user.email.toLowerCase()
        await User.findOneAndUpdate(
          { email },
          { $setOnInsert: { name: user.name || email.split('@')[0], email, image: user.image } },
          { upsert: true }
        )
        // OAuth or a magic link proves the inbox. The first time, drop any password set by
        // an unverified sign-up, so nobody can pre-register someone else's email.
        if (account?.provider !== 'credentials') {
          await User.updateOne({ email, emailVerified: null }, { $set: { emailVerified: new Date() }, $unset: { password: 1 } })
        }
        return true
      } catch (error) {
        logError('Sign in error', error)
        return false
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.hasAccess = Boolean(user.hasAccess)
        token.owner = isOwnerEmail(user.email) || user.id === 'admin-owner'
      }
      if (token.owner || isOwnerEmail(token.email) || token.id === 'admin-owner') {
        token.owner = true
        token.hasAccess = true
        token.email = token.email || adminEmail()
        token.name = token.name || 'Admin'
        return token
      }
      if (token.email) {
        try {
          await connectDB()
          const dbUser = await User.findOne({ email: token.email.toLowerCase() }).select('hasAccess')
          if (dbUser) {
            token.id = dbUser._id.toString()
            token.hasAccess = Boolean(dbUser.hasAccess)
          }
        } catch (error) {
          logError('JWT user lookup error', error)
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id || token.sub
        session.user.owner = Boolean(token.owner)
        session.user.hasAccess = Boolean(token.hasAccess || token.owner)
        session.user.email = token.email || session.user.email
        if (token.name) session.user.name = token.name
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    verifyRequest: '/auth/verify',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
