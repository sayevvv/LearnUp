import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import argon2 from 'argon2';
import { prisma } from '@/lib/prisma';
import { sanitizeString, rateLimit, getClientIp, isSameOrigin } from '@/lib/security';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // CSRF basic: enforce same-origin for browsers
    if (!isSameOrigin(req as any)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    // Rate limit per IP
    const ip = getClientIp(req as any);
    const rl = rateLimit(`signup:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi nanti.' }, { status: 429 });
    }

    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const { email, password, name } = parsed.data;
    const normalizedEmail = sanitizeString(email, { maxLen: 254 }).toLowerCase();
    const safeName = name ? sanitizeString(name, { maxLen: 100 }) : null;

    // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    // Temporary cast to any to work around Prisma type mismatch on passwordHash
  await (prisma as any).user.create({
      data: {
    email: normalizedEmail,
    name: safeName,
        passwordHash,
      } as any,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e) {
    console.error('Signup error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
