import NextAuth from "next-auth";
import { authOptions } from "@/auth.config"; // Impor konfigurasi

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

// Ensure this route runs on Node.js and is never statically optimized.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';