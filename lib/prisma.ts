// lib/prisma.ts

import { PrismaClient } from '@prisma/client'

// Deklarasikan variabel global untuk menyimpan cache instance prisma
declare global {
  var prisma: PrismaClient | undefined
}

// Buat instance prisma, gunakan cache jika ada di environment development
// untuk menghindari pembuatan instance baru setiap kali ada hot-reload.
// Ensure the Prisma Client uses whichever env var is provided.
// Prefer PRISMA_DATABASE_URL; fall back to DATABASE_URL; finally POSTGRES_URL (common in some setups).
const dbUrl =
  process.env.PRISMA_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL

export const prisma =
  global.prisma ||
  new PrismaClient(
    dbUrl
      ? {
          datasources: {
            db: { url: dbUrl },
          },
        }
      : undefined
  )

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}