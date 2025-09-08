// components/SignupCard.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupCard() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/manual/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.toLowerCase().trim(),
          password,
        }),
      });
      if (res.ok) {
        setSuccess("Pendaftaran berhasil. Mengarahkan ke halaman masuk...");
        setTimeout(() => router.push("/login"), 800);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Gagal mendaftar.");
      }
  } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
  <form onSubmit={onSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Nama lengkap (opsional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
    className="w-full h-12 rounded-xl px-4 border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
      />
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="Alamat email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
    className="w-full h-12 rounded-xl px-4 border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
        required
      />
      <input
        type="password"
        autoComplete="new-password"
        placeholder="Kata sandi (min. 8 karakter)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
    className="w-full h-12 rounded-xl px-4 border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
        minLength={8}
        required
      />
      {error && (
        <div className="text-sm text-red-600 font-medium" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm text-green-600 font-medium" role="status">
          {success}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
  className="w-full h-12 rounded-xl bg-slate-900 text-white font-medium tracking-wide hover:bg-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Memproses..." : "Daftar"}
      </button>
    </form>
  );
}
