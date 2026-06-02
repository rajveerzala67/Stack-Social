"use client";

import Link from "next/link";
import { Bell, User, Settings } from "lucide-react";

export default function MobileHeader() {
  return (
    <nav className="lg:hidden fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant h-16 flex items-center justify-between px-margin-mobile">
      <Link href="/">
        <span className="font-headline-lg text-headline-lg tracking-tighter text-primary cursor-pointer">
          STACK
        </span>
      </Link>
      <div className="flex gap-4 items-center">
        <Link href="/notifications" className="flex items-center">
          <Bell className="text-primary cursor-pointer" size={22} />
        </Link>
        <Link href="/settings" className="flex items-center">
          <Settings className="text-primary cursor-pointer" size={22} />
        </Link>
        <Link href="/profile" className="flex items-center">
          <User className="text-primary cursor-pointer" size={22} />
        </Link>
      </div>
    </nav>
  );
}
