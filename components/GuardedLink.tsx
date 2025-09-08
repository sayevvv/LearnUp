"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import LoginGateModal from "./LoginGateModal";

export default function GuardedLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const isAuthed = !!(session as any)?.user?.id;
  const loading = status === "loading";

  if (isAuthed) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen(true)}
        className={className}
      >
        {children}
      </button>
      <LoginGateModal open={open} onClose={() => setOpen(false)} target={href} />
    </>
  );
}
