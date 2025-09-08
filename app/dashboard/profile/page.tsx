// app/dashboard/profile/page.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Pencil, Settings as SettingsIcon, Moon, Sun } from "lucide-react";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  // Initialize hooks first to satisfy rules-of-hooks
  const user = session?.user as any;
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.image || "");
  const [isOAuth, setIsOAuth] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/user/accounts')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data && data.hasOAuth) setIsOAuth(true); })
      .catch(() => {});
    try {
      const el = document.documentElement;
      setIsDark(el.classList.contains('dark'));
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  };

  if (status === "loading") {
    return <div className="flex h-full items-center justify-center">Memuat profil…</div>;
  }

  if (!session) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Profil</h1>
          <p className="mt-2 text-slate-600">Anda belum masuk.</p>
          <Link href="/login?callbackUrl=/dashboard/profile" className="inline-flex mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700">Masuk</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900">Profil</h1>

        {/* Mobile top actions: full-bleed across screen width */}
        {session && (
          <div className="mt-4 lg:hidden -mx-4 sm:-mx-6">
            <div className="w-full px-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/dashboard/settings" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <SettingsIcon className="h-4 w-4" /> Settings
                </Link>
                <button onClick={() => toggleTheme()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {isDark ? 'Light' : 'Dark'}
                </button>
                <button onClick={() => signOut({ callbackUrl: '/' })} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm text-white font-semibold hover:bg-red-700">Keluar</button>
              </div>
            </div>
          </div>
        )}

        {/* Profile header card */}
  <section className="mt-4 sm:mt-6 bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 flex items-center gap-4">
          <div className="relative group h-[72px] w-[72px]">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={user?.name || "User"}
                width={72}
                height={72}
                className="h-[72px] w-[72px] rounded-full object-cover"
                unoptimized={avatarUrl.startsWith('data:')}
                priority
              />
            ) : (
              <div className="h-[72px] w-[72px] rounded-full bg-slate-200" />
            )}
            <button
              type="button"
              onClick={() => { setModalOpen(true); setErrorMsg(null); setUrlInput(""); setFileName(""); }}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition"
              title="Ubah foto profil"
            >
              <Pencil className="h-5 w-5 text-white" />
            </button>
          </div>
          <div className="min-w-0">
            <div className="text-lg font-semibold text-slate-900 truncate">{user?.name || "Pengguna"}</div>
            <div className="text-slate-600 text-sm truncate">{user?.email}</div>
            <div className="mt-2 text-xs text-slate-500">ID: {user?.id}</div>
            {isOAuth && (
              <div className="mt-2 text-xs text-emerald-700">Foto profil Google digunakan secara default.</div>
            )}
          </div>
          <div className="ml-auto hidden lg:flex items-center gap-2">
            <Link href="/dashboard/settings" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <SettingsIcon className="h-4 w-4" /> Settings
            </Link>
            <button onClick={() => toggleTheme()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {isDark ? 'Light' : 'Dark'}
            </button>
            <button onClick={() => signOut({ callbackUrl: '/' })} className="rounded-lg bg-red-600 px-4 py-2 text-white font-semibold hover:bg-red-700">Keluar</button>
          </div>
        </section>

        {/* Editable display name (client-side only skeleton; server update endpoint can be added later) */}
        <section className="mt-6 bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900">Informasi Dasar</h2>
          <p className="mt-1 text-sm text-slate-600">Kelola identitas Anda yang ditampilkan ke publik.</p>
          <form className="mt-4 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-slate-700">Nama Tampilan</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full h-11 rounded-md border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-slate-400"
                maxLength={100}
                placeholder="Nama Anda"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <div className="mt-1 h-11 flex items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-slate-700">
                {user?.email || '-'}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={() => setDisplayName(user?.name || '')} className="h-10 px-4 rounded-md border border-slate-300 text-slate-700">Reset</button>
              <button type="submit" className="h-10 px-4 rounded-md bg-slate-900 text-white">Simpan (segera)</button>
            </div>
          </form>
        </section>

        {/* Account & Security tips */}
        <section className="mt-6 bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900">Keamanan Akun</h2>
          <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 space-y-2">
            <li>Gunakan kata sandi yang kuat dan unik untuk akun ini.</li>
            <li>Hindari berbagi kredensial. Kami tidak akan pernah meminta kata sandi Anda.</li>
            <li>Perbarui sesi Anda secara berkala; keluar dari perangkat yang tidak digunakan.</li>
          </ul>
        </section>

        {/* Avatar uploader */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => !uploading && setModalOpen(false)} />
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900">Edit Foto Profil</h3>
              <p className="mt-1 text-sm text-slate-600">Pilih salah satu metode di bawah ini.</p>
              {errorMsg && <div className="mt-3 text-sm text-red-600">{errorMsg}</div>}
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">URL Gambar (https)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    className="mt-1 w-full h-11 rounded-md border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Atau upload file (max ~2MB)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      setErrorMsg(null);
                      const f = e.target.files?.[0];
                      if (!f) { setFileName(""); return; }
                      setFileName(f.name);
                      if (f.size > 2 * 1024 * 1024) {
                        setErrorMsg('Ukuran file terlalu besar (>2MB).');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const result = reader.result as string;
                        setUrlInput(""); // prefer file over URL
                        // Store temporarily in fileName state only; we will send directly on Save
                        setFileName(result);
                      };
                      reader.readAsDataURL(f);
                    }}
                    className="mt-1"
                  />
                  {fileName && !fileName.startsWith('data:') && (
                    <div className="mt-1 text-xs text-slate-500">{fileName}</div>
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => !uploading && setModalOpen(false)}
                  className="h-10 px-4 rounded-md border border-slate-300"
                  disabled={uploading}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="h-10 px-4 rounded-md bg-slate-900 text-white disabled:opacity-60"
                  disabled={uploading}
                  onClick={async () => {
                    setErrorMsg(null);
                    const hasDataUrl = fileName.startsWith('data:');
                    const hasUrl = urlInput.trim().length > 0;
                    if (!hasDataUrl && !hasUrl) {
                      setErrorMsg('Masukkan URL atau pilih file.');
                      return;
                    }
                    setUploading(true);
                    try {
                      const body = hasDataUrl ? { dataUrl: fileName } : { url: urlInput.trim() };
                      const res = await fetch('/api/user/avatar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setAvatarUrl(data.image);
                        setModalOpen(false);
                      } else {
                        const err = await res.json().catch(() => ({}));
                        setErrorMsg(err?.error || 'Gagal menyimpan gambar.');
                      }
                    } finally {
                      setUploading(false);
                    }
                  }}
                >
                  {uploading ? 'Menyimpan…' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Links */}
        <section className="mt-6 bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900">Tautan Cepat</h2>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href="/dashboard/roadmaps" className="rounded-md border border-slate-300 px-3 py-2 hover:bg-slate-50">Roadmap Saya</Link>
            <Link href="/dashboard/browse" className="rounded-md border border-slate-300 px-3 py-2 hover:bg-slate-50">Jelajah</Link>
            <Link href="/dashboard/new" className="rounded-md border border-slate-300 px-3 py-2 hover:bg-slate-50">Buat Roadmap</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
