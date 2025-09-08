// components/AuthButtons.tsx
"use client";

import { Fragment } from "react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { FaUserCircle } from "react-icons/fa";
import { Menu, Transition } from "@headlessui/react";
import { LogOut, LogIn } from "lucide-react";

export default function AuthButtons() {
  const { data: session, status } = useSession();

  // Tampilan Loading
  if (status === "loading") {
    return <div className="fixed top-4 right-4 h-12 w-12 rounded-full bg-slate-200 animate-pulse z-50" />;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button className="flex items-center gap-3 rounded-xl bg-white/80 p-2 shadow-lg backdrop-blur-sm ring-1 ring-slate-900/5 hover:bg-white/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || "User avatar"}
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <FaUserCircle className="h-8 w-8 text-slate-400" />
            )}
            <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-slate-800">
                  {session?.user?.name || "Guest"}
                </p>
            </div>
          </Menu.Button>
        </div>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-slate-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="px-1 py-1 ">
              {session?.user ? (
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => signOut()}
                      className={`${
                        active ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                      } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                    >
                      <LogOut className="mr-2 h-5 w-5 text-slate-400" aria-hidden="true" />
                      Logout
                    </button>
                  )}
                </Menu.Item>
              ) : (
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      href="/login"
                      className={`${
                        active ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                      } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                    >
                      <LogIn className="mr-2 h-5 w-5 text-slate-400" aria-hidden="true" />
                      Login with Google
                    </Link>
                  )}
                </Menu.Item>
              )}
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
}
