"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { Search, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export default function RightSidebar() {
  const pathname = usePathname();
  const sidebarRef = useRef(null);
  const { user } = useAuth();

  const [creators, setCreators] = useState([]);
  const [followingMap, setFollowingMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(true);

  // Track viewport size to avoid queries when sidebar is hidden
  useEffect(() => {
    const handleResize = () => {
      const threshold = pathname === "/profile" ? 1024 : 1280;
      setIsMobileViewport(window.innerWidth < threshold);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pathname]);

  // Fetch suggested creators
  const fetchSuggestions = useCallback(async () => {
    if (!user || isMobileViewport) {
      setLoading(false);
      return;
    }
    try {
      // 1. Fetch some users excluding current user
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, role")
        .neq("id", user.id)
        .limit(10);

      if (usersError) throw usersError;

      // 2. Fetch current user follows
      const { data: followsData, error: followsError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (followsError) throw followsError;

      const fMap = {};
      (followsData || []).forEach((f) => {
        fMap[f.following_id] = true;
      });
      setFollowingMap(fMap);
      setCreators(usersData || []);
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    } finally {
      setLoading(false);
    }
  }, [user, isMobileViewport]);

  useEffect(() => {
    if (!isMobileViewport) {
      fetchSuggestions();
    } else {
      setLoading(false);
    }
  }, [fetchSuggestions, isMobileViewport]);

  // Animate sidebar content entrance on change
  useEffect(() => {
    if (!sidebarRef.current || loading || creators.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.from(".sidebar-section", {
        opacity: 0,
        y: 20,
        stagger: 0.1,
        duration: 0.7,
        ease: "power2.out",
      });
    }, sidebarRef.current);

    return () => ctx.revert();
  }, [pathname, loading, creators.length]);

  // Handle follow/unfollow toggle
  const toggleFollow = async (creatorId) => {
    if (!user) return;
    const isFollowing = followingMap[creatorId];

    // Optimistic UI update
    setFollowingMap((prev) => ({ ...prev, [creatorId]: !isFollowing }));

    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", creatorId);
      } else {
        // Follow
        await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: creatorId, status: "accepted" });

        // Create a notification
        await supabase.from("notifications").insert({
          recipient_id: creatorId,
          actor_id: user.id,
          type: "follow",
          message: "started following you.",
        });
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
      // Revert optimistic update
      setFollowingMap((prev) => ({ ...prev, [creatorId]: isFollowing }));
    }
  };

  // Live search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url, role")
          .neq("id", user?.id)
          .or(`display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
          .limit(5);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, user]);

  // Hide sidebar on Messages, Create, and Settings pages for clean focused workspace
  const isCenteredPage = ["/messages", "/create", "/settings"].includes(pathname);
  if (isCenteredPage) {
    return null;
  }

  // Profile-specific sidebar content
  if (pathname === "/profile") {
    return (
      <aside
        ref={sidebarRef}
        className="fixed right-0 top-0 h-full w-80 hidden lg:flex flex-col bg-surface border-l border-outline-variant py-stack-md z-40 overflow-y-auto"
      >
        {/* Suggested Creators on Profile page */}
        <div className="sidebar-section px-6 mb-stack-md">
          <h3 className="font-label-md text-label-md text-primary uppercase tracking-widest mb-6">
            Recommended Curators
          </h3>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin text-secondary" size={20} />
            </div>
          ) : (
            <div className="space-y-4">
              {creators.slice(0, 5).map((creator) => (
                <div key={creator.id} className="flex items-center justify-between">
                  <Link href={`/profile?id=${creator.id}`} className="flex items-center gap-3 hover:opacity-75 transition-opacity cursor-pointer">
                    <div className="w-8 h-8 bg-surface-container rounded-full overflow-hidden shrink-0">
                      <img
                        alt={creator.display_name}
                        className="w-full h-full object-cover"
                        src={creator.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.display_name || "U")}&background=1A1A1A&color=fff`}
                      />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-label-md text-xs text-primary">{creator.display_name}</span>
                      <span className="font-caption text-[10px] text-secondary">@{creator.username}</span>
                    </div>
                  </Link>
                  <button onClick={() => toggleFollow(creator.id)}
                    className="text-primary font-bold text-xs uppercase hover:underline cursor-pointer">
                    {followingMap[creator.id] ? "Following" : "Follow"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="sidebar-section mt-auto pt-stack-md border-t border-outline-variant px-6">
          <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4">
            <Link className="font-caption text-[10px] uppercase tracking-widest text-secondary hover:text-primary transition-colors" href="/about">About</Link>
            <Link className="font-caption text-[10px] uppercase tracking-widest text-secondary hover:text-primary transition-colors" href="/privacy">Privacy</Link>
            <Link className="font-caption text-[10px] uppercase tracking-widest text-secondary hover:text-primary transition-colors" href="/terms">Terms</Link>
          </div>
          <p className="font-caption text-[10px] uppercase tracking-[0.2em] text-secondary/50">© 2024 STACK SOCIAL</p>
        </footer>
      </aside>
    );
  }

  // Home & Discover sidebar
  return (
    <aside
      ref={sidebarRef}
      className="fixed right-0 top-0 h-full w-80 hidden xl:flex flex-col bg-surface py-stack-md px-8 border-l border-outline-variant overflow-y-auto"
    >
      {/* Search Bar */}
      <div className="sidebar-section relative mb-stack-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface-container-low border border-outline-variant py-2 pl-10 pr-4 text-label-md font-body-md focus:ring-0 focus:border-primary transition-colors text-primary"
          placeholder="Search creators..."
        />
        {/* Search Results overlay */}
        {searchQuery.trim() && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-surface border border-outline-variant shadow-lg rounded-sm z-50 p-2 max-h-60 overflow-y-auto space-y-2">
            {isSearching ? (
              <div className="flex justify-center p-4">
                <Loader2 className="animate-spin text-secondary" size={16} />
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-xs text-secondary text-center p-2">No creators found</p>
            ) : (
              searchResults.map((res) => (
                <div key={res.id} className="flex items-center justify-between p-2 hover:bg-surface-container-low transition-colors rounded-sm">
                  <Link href={`/profile?id=${res.id}`} className="flex items-center gap-2 hover:opacity-75 transition-opacity cursor-pointer">
                    <img src={res.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(res.display_name || "U")}&background=1A1A1A&color=fff`}
                      className="w-6 h-6 rounded-full object-cover" alt="" />
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-primary">{res.display_name}</span>
                      <span className="text-[10px] text-secondary">@{res.username}</span>
                    </div>
                  </Link>
                  <button onClick={() => toggleFollow(res.id)} className="text-xs font-bold text-primary uppercase cursor-pointer">
                    {followingMap[res.id] ? "Unfollow" : "Follow"}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Curated Creators */}
      <section className="sidebar-section mb-stack-lg">
        <h4 className="font-label-md text-label-md uppercase tracking-[0.2em] text-secondary mb-6">
          Curated Creators
        </h4>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin text-secondary" size={20} />
          </div>
        ) : (
          <div className="space-y-6">
            {creators.slice(0, 3).map((creator) => (
              <div key={creator.id} className="flex items-center justify-between group">
                <Link href={`/profile?id=${creator.id}`} className="flex items-center gap-3 hover:opacity-75 transition-opacity cursor-pointer">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant shrink-0 bg-surface-container-low">
                    <img
                      className="w-full h-full object-cover"
                      src={creator.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.display_name || "U")}&background=1A1A1A&color=fff`}
                      alt={creator.display_name}
                    />
                  </div>
                  <div className="text-left">
                    <p className="font-label-md text-label-md text-primary">{creator.display_name}</p>
                    <p className="font-caption text-caption text-secondary">{creator.role || "Design Curator"}</p>
                  </div>
                </Link>
                <button onClick={() => toggleFollow(creator.id)}
                  className="font-label-md text-[11px] uppercase tracking-widest text-primary border-b border-primary pb-0.5 group-hover:opacity-70 transition-opacity cursor-pointer">
                  {followingMap[creator.id] ? "Unfollow" : "Follow"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Editorial Trends */}
      <section className="sidebar-section mb-stack-lg">
        <h4 className="font-label-md text-label-md uppercase tracking-[0.2em] text-secondary mb-6">
          Editorial Trends
        </h4>
        <div className="space-y-4">
          <a href="#" className="block group">
            <p className="font-caption text-caption text-secondary mb-1">Architecture</p>
            <p className="font-body-md text-body-md text-primary font-medium group-hover:underline">
              The Brutalist Revival in Stockholm
            </p>
            <p className="font-caption text-caption text-secondary mt-1">4.2K reads this week</p>
          </a>
          <a href="#" className="block group">
            <p className="font-caption text-caption text-secondary mb-1">Lifestyle</p>
            <p className="font-body-md text-body-md text-primary font-medium group-hover:underline">
              Digital Minimalism and Mental Clarity
            </p>
            <p className="font-caption text-caption text-secondary mt-1">2.1K curators sharing</p>
          </a>
          <a href="#" className="block group">
            <p className="font-caption text-caption text-secondary mb-1">Photography</p>
            <p className="font-body-md text-body-md text-primary font-medium group-hover:underline">
              Natural Light: A Photographer's Diary
            </p>
            <p className="font-caption text-caption text-secondary mt-1">Featured by VOGUE</p>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="sidebar-section mt-auto pt-stack-md border-t border-outline-variant">
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4">
          <Link className="font-caption text-[10px] uppercase tracking-widest text-secondary hover:text-primary transition-colors" href="/about">About</Link>
          <Link className="font-caption text-[10px] uppercase tracking-widest text-secondary hover:text-primary transition-colors" href="/privacy">Privacy</Link>
          <Link className="font-caption text-[10px] uppercase tracking-widest text-secondary hover:text-primary transition-colors" href="/terms">Terms</Link>
          <Link className="font-caption text-[10px] uppercase tracking-widest text-secondary hover:text-primary transition-colors" href="/editorial-guidelines">Editorial Guidelines</Link>
        </div>
        <p className="font-caption text-[10px] uppercase tracking-[0.2em] text-secondary/50">
          © 2024 STACK SOCIAL
        </p>
      </footer>
    </aside>
  );
}
