"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Home, Compass, Mail, Bell, Plus, User, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { label: "Home", path: "/", icon: Home },
  { label: "Discover", path: "/discover", icon: Compass },
  { label: "Messages", path: "/messages", icon: Mail },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Create", path: "/create", icon: Plus },
  { label: "Profile", path: "/profile", icon: User },
  { label: "Settings", path: "/settings", icon: Settings },
];

export default function SideNavBar() {
  const pathname = usePathname();
  const navRef = useRef(null);
  const navContainerRef = useRef(null);
  const indicatorRef = useRef(null);
  const [currentHash, setCurrentHash] = useState("");
  const { profile } = useAuth();

  // Animate the sidebar entry
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".nav-item", {
        opacity: 0,
        stagger: 0.05,
        duration: 0.6,
        ease: "power2.out",
      });
      gsap.from(".profile-footer", {
        y: 20,
        opacity: 0,
        duration: 0.8,
        delay: 0.3,
        ease: "power2.out",
      });
    }, navRef);

    return () => ctx.revert();
  }, []);

  // Listen to hash change events for Notifications
  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentHash(window.location.hash);
      const handleHashChange = () => {
        setCurrentHash(window.location.hash);
      };
      window.addEventListener("hashchange", handleHashChange);
      return () => window.removeEventListener("hashchange", handleHashChange);
    }
  }, []);

  const getIsActive = (item) => {
    if (item.path.includes("#")) {
      const [path, hash] = item.path.split("#");
      return pathname === path && currentHash === `#${hash}`;
    }
    if (item.path === "/") {
      return pathname === "/" && !currentHash;
    }
    return pathname === item.path;
  };

  const activeIndex = navItems.findIndex((item) => getIsActive(item));

  // Animate the active indicator bar vertically
  useEffect(() => {
    if (!indicatorRef.current || !navContainerRef.current) return;

    const updatePosition = () => {
      if (activeIndex === -1) {
        gsap.to(indicatorRef.current, { opacity: 0, duration: 0.2 });
        return;
      }

      const navElements = navContainerRef.current.querySelectorAll(".nav-item");
      const activeEl = navElements[activeIndex];
      if (activeEl) {
        const activeElTop = activeEl.offsetTop;
        const activeElHeight = activeEl.offsetHeight;
        const targetY = activeElTop + (activeElHeight - 24) / 2;

        gsap.to(indicatorRef.current, {
          y: targetY,
          opacity: 1,
          duration: 0.45,
          ease: "power2.out",
        });
      }
    };

    // Run immediately
    updatePosition();

    // Run after a short delay to guarantee layout is computed correctly
    const timer = setTimeout(updatePosition, 100);
    return () => clearTimeout(timer);
  }, [pathname, activeIndex]);

  return (
    <aside
      ref={navRef}
      className="fixed left-0 top-0 h-full w-64 hidden lg:flex flex-col bg-surface py-stack-md border-r border-outline-variant z-50 justify-between"
    >
      {/* Top: Logo */}
      <div className="px-6 mb-stack-lg animate-fade-in shrink-0">
        <Link href="/">
          <span className="font-headline-lg text-headline-lg text-primary tracking-tighter cursor-pointer hover:opacity-75 transition-opacity">
            STACK SOCIAL
          </span>
        </Link>
        <p className="font-caption text-caption uppercase tracking-widest text-secondary mt-1">
          Editorial Curation
        </p>
      </div>

      {/* Middle: Nav */}
      <div className="flex-1 flex flex-col justify-center shrink-0">
        <nav ref={navContainerRef} className="space-y-1 relative">
          {navItems.map((item) => {
            const isActive = getIsActive(item);
            const IconComponent = item.icon;
            return (
              <Link
                key={item.label}
                href={item.path}
                className={`nav-item flex items-center gap-4 py-3 px-6 hover:bg-surface-container-high transition-colors relative group active:opacity-80 ${isActive
                    ? "text-primary font-semibold bg-surface-container-low"
                    : "text-secondary"
                  }`}
              >
                <IconComponent
                  size={20}
                  strokeWidth={isActive ? 2.5 : 2}
                  className="transition-transform duration-300 group-hover:scale-110 shrink-0"
                />
                <span className="font-body-md text-body-md leading-none flex items-center h-5">{item.label}</span>
              </Link>
            );
          })}
          {/* Shared Active Indicator Bar */}
          <div
            ref={indicatorRef}
            className="absolute left-0 w-[3px] h-[24px] bg-primary rounded-r pointer-events-none opacity-0 z-10"
            style={{ top: 0 }}
          />
        </nav>
      </div>

      {/* Bottom: Profile Footer */}
      <div className="profile-footer pt-stack-md border-t border-outline-variant shrink-0">
        <Link
          href="/profile"
          className="flex items-center gap-4 py-3 px-6 hover:bg-surface-container-high transition-colors group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-surface-variant overflow-hidden border border-outline-variant shrink-0 transition-transform duration-500">
            <img
              alt={profile?.display_name || "User Profile"}
              className="w-full h-full object-cover"
              src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.display_name || "U")}&background=1A1A1A&color=fff`}
            />
          </div>
          <div className="min-w-0">
            <p className="font-label-md text-label-md text-primary truncate group-hover:text-black">
              {profile?.display_name || "Guest"}
            </p>
            <p className="font-caption text-caption text-secondary truncate">
              {profile?.role || "Curator"}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
