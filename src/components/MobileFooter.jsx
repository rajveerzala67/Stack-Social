"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Plus, Mail, User } from "lucide-react";

export default function MobileFooter() {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", path: "/", icon: Home },
    { label: "Discover", path: "/discover", icon: Compass },
    { label: "Create", path: "/create", icon: Plus },
    { label: "Messages", path: "/messages", icon: Mail },
    { label: "Profile", path: "/profile", icon: User },
  ];

  const handleTabClick = (path, e) => {
    if (pathname === path) {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom)] h-[calc(4rem+env(safe-area-inset-bottom))] bg-surface-bright/90 backdrop-blur-xl border-t border-outline-variant flex justify-around items-center z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        const IconComponent = item.icon;
        return (
          <Link
            key={item.label}
            href={item.path}
            onClick={(e) => handleTabClick(item.path, e)}
            className={`flex flex-col items-center justify-center p-3 transition-transform active:scale-90 ${
              isActive ? "text-primary font-bold" : "text-secondary"
            }`}
          >
            <IconComponent
              size={24}
              strokeWidth={isActive ? 2.5 : 2}
              className="transition-transform duration-300"
            />
          </Link>
        );
      })}
    </nav>
  );
}
