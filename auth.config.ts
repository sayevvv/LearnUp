import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import argon2 from 'argon2'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'database' },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID || '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim()
        const password = credentials?.password || ''
        if (!email || !password) return null
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user?.passwordHash) return null
        const ok = await argon2.verify(user.passwordHash, password)
        return ok ? { id: user.id, email: user.email, name: user.name } as any : null
      },
    }),
  ],
  callbacks: {
    async session({ session, user, token }) {
      // When using database sessions, NextAuth passes `user` here
      if (user) {
        ;(session as any).user.id = user.id
        ;(session as any).user.role = (user as any).role
      }
      // For JWT sessions fallback (if configured)
      if ((token as any)?.sub) {
        ;(session as any).user = (session as any).user || {}
        ;(session as any).user.id = (token as any).sub
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.AUTH_SECRET,
}

export default authOptions
