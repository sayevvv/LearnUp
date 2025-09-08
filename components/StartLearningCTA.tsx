"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export function StartLearningCTA({ className = "", forceLogin = false }: { className?: string; forceLogin?: boolean }) {
  const { status } = useSession();
  const href = forceLogin
    ? "/login"
    : status === "authenticated"
      ? "/dashboard/new"
      : "/login?callbackUrl=%2Fdashboard%2Fnew";
  return (
    <Link
      href={href}
      className={
        className ||
        "rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500"
      }
    >
      Start Learning
    </Link>
  );
}
