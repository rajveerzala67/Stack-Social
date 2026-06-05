"use client";

import { usePathname, useRouter } from "next/navigation";
import SideNavBar from "./SideNavBar";
import RightSidebar from "./RightSidebar";
import MobileHeader from "./MobileHeader";
import MobileFooter from "./MobileFooter";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useAuth } from "@/context/AuthContext";

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const mainRef = useRef(null);
  const { user, isLoading } = useAuth();

  // Redirect to /login if not authenticated and not already on public pages
  const publicPages = ["/login", "/forgot-password", "/about", "/privacy", "/terms", "/editorial-guidelines"];
  const isPublicPage = publicPages.includes(pathname);

  useEffect(() => {
    if (!isLoading && !user && !isPublicPage) {
      router.push("/login");
    }
  }, [isLoading, user, isPublicPage, router]);

  // Trigger page load animation transitions on route change
  useEffect(() => {
    if (!mainRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        mainRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );
    }, mainRef.current);

    return () => ctx.revert();
  }, [pathname]);

  // If on public pages (login, forgot-password), render children directly
  if (isPublicPage) {
    return <>{children}</>;
  }

  // While checking auth state, show spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-ivory flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If not logged in (redirect will fire), show spinner
  if (!user) {
    return (
      <div className="min-h-screen bg-brand-ivory flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Determine if page has a right sidebar
  const hasRightSidebar = ["/", "/discover", "/profile", "/notifications"].includes(pathname);

  const isCreatePage = pathname === "/create";

  const mainClass = `flex-1 min-w-0 ${isCreatePage ? "" : "pt-16"} lg:pt-0 lg:pl-64 w-full ${
    hasRightSidebar ? "xl:pr-80" : ""
  }`;

  return (
    <div className="flex max-w-[1440px] mx-auto min-h-screen w-full bg-brand-ivory relative">
      <SideNavBar />
      {!isCreatePage && <MobileHeader />}
      <main ref={mainRef} className={mainClass}>
        <div className={`min-h-screen ${isCreatePage ? "" : "pb-[calc(4rem+env(safe-area-inset-bottom))]"} lg:pb-0`}>
          {children}
        </div>
      </main>
      <RightSidebar />
      {!isCreatePage && <MobileFooter />}
    </div>
  );
}
