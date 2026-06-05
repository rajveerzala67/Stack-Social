"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { Star, CheckCircle2, ChevronRight, Loader2, Sparkles, X, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export default function Settings() {
  const containerRef = useRef(null);
  const router = useRouter();
  const { signOut, profile, updateProfile } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Toggle states
  const [pushNotif, setPushNotif] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);
  const [directMsg, setDirectMsg] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  // Privacy setting
  const [isPrivate, setIsPrivate] = useState(false);

  // Blocked list
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [searchBlockQuery, setSearchBlockQuery] = useState("");
  const [searchBlockResults, setSearchBlockResults] = useState([]);
  const [searchingBlock, setSearchingBlock] = useState(false);

  // Initialize states from database profile
  useEffect(() => {
    if (profile) {
      setPushNotif(profile.push_notifications ?? true);
      setEmailDigest(profile.email_digest ?? false);
      setDirectMsg(profile.direct_messages ?? true);
      setDarkMode(profile.dark_mode ?? false);
      setReducedMotion(profile.reduced_motion ?? false);
      setIsPrivate(profile.is_private ?? false);
    }
  }, [profile]);

  const fetchBlockedUsers = async () => {
    if (!profile) return;
    setLoadingBlocked(true);
    try {
      const { data, error } = await supabase
        .from("blocks")
        .select("id, blocked_id, blocked_profile:profiles!blocked_id(id, display_name, username, avatar_url)")
        .eq("blocker_id", profile.id);

      if (error) throw error;
      setBlockedUsers(data || []);
    } catch (err) {
      console.error("Error loading blocked users:", err);
    } finally {
      setLoadingBlocked(false);
    }
  };

  useEffect(() => {
    if (showBlockedModal) {
      fetchBlockedUsers();
    }
  }, [showBlockedModal]);

  useEffect(() => {
    if (!searchBlockQuery.trim()) {
      setSearchBlockResults([]);
      setSearchingBlock(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingBlock(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .neq("id", profile?.id)
          .or(`display_name.ilike.%${searchBlockQuery}%,username.ilike.%${searchBlockQuery}%`)
          .limit(5);

        if (error) throw error;
        setSearchBlockResults(data || []);
      } catch (err) {
        console.error("Search block error:", err);
      } finally {
        setSearchingBlock(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchBlockQuery, profile]);

  const handleBlockUser = async (targetUser) => {
    if (!profile) return;
    try {
      const { error: blockError } = await supabase
        .from("blocks")
        .insert({
          blocker_id: profile.id,
          blocked_id: targetUser.id,
        });

      if (blockError) throw blockError;

      // Automatically unfollow each other when blocked
      await supabase
        .from("follows")
        .delete()
        .or(`and(follower_id.eq.${profile.id},following_id.eq.${targetUser.id}),and(follower_id.eq.${targetUser.id},following_id.eq.${profile.id})`);

      fetchBlockedUsers();
      setSearchBlockQuery("");
    } catch (err) {
      console.error("Block user error:", err);
      alert("Failed to block user.");
    }
  };

  const handleUnblockUser = async (blockId) => {
    try {
      const { error } = await supabase
        .from("blocks")
        .delete()
        .eq("id", blockId);

      if (error) throw error;
      fetchBlockedUsers();
    } catch (err) {
      console.error("Unblock user error:", err);
      alert("Failed to unblock user.");
    }
  };

  // Synchronize Dark Mode CSS Class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // General settings update helper
  const handleToggle = async (key, currentValue, setter) => {
    const nextValue = !currentValue;
    setter(nextValue);

    try {
      await updateProfile({ [key]: nextValue });
    } catch (err) {
      console.error(`Failed to update ${key}:`, err);
      // Revert state on failure
      setter(currentValue);
    }
  };

  // Specific Dark Mode toggle handler with GSAP transition effect
  const handleDarkModeToggle = async () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);

    // Apply filter flash animation
    gsap.fromTo(
      "body",
      { filter: "invert(0.08)" },
      { filter: "invert(0)", duration: 0.35, ease: "power2.out" }
    );

    try {
      await updateProfile({ dark_mode: nextDark });
    } catch (err) {
      console.error("Failed to update dark mode setting:", err);
      setDarkMode(darkMode); // Revert on failure
    }
  };

  // Upgrade to Legacy Premium
  const handleUpgradeToLegacy = async () => {
    setIsUpgrading(true);
    try {
      await updateProfile({
        is_legacy: true,
        is_verified: true,
        role: "Legacy Creator",
      });
      setUpgradeSuccess(true);
    } catch (err) {
      console.error("Upgrade error:", err);
      alert("Failed to upgrade account. Try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  // Entrance animations
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      // Stagger load settings elements
      const isMobile = window.innerWidth < 768;
      gsap.from("section", {
        opacity: 0,
        y: isMobile ? 8 : 15,
        stagger: isMobile ? 0.02 : 0.08,
        duration: isMobile ? 0.35 : 0.5,
        ease: "power2.out",
      });

      // Slider click animations
      document.querySelectorAll(".slider").forEach((el) => {
        el.addEventListener("mousedown", () => {
          gsap.to(el, { scale: 0.96, duration: 0.1 });
        });
        el.addEventListener("mouseup", () => {
          gsap.to(el, { scale: 1, duration: 0.1 });
        });
      });
    }, containerRef.current);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="min-h-screen flex justify-center pt-8 pb-stack-lg"
    >
      <div className="w-full max-w-[720px] px-margin-mobile md:px-margin-desktop py-4">
        {/* Header */}
        <header className="mb-stack-lg border-b border-outline-variant/30 pb-stack-sm">
          <h2 className="font-display-md text-display-md text-primary mb-2">Settings</h2>
          <p className="font-body-lg text-body-lg text-secondary">
            Manage your experience and account preferences.
          </p>
        </header>

        {/* Settings Grid */}
        <div className="flex flex-col gap-stack-lg select-none">
          {/* Section: Notifications */}
          <section className="space-y-4">
            <h3 className="font-label-md text-label-md text-primary uppercase tracking-widest border-b border-outline-variant/20 pb-2">
              Notifications
            </h3>
            <div className="space-y-gutter">
              {/* Push Notifications */}
              <div className="flex justify-between items-center py-2 cursor-pointer" 
                onClick={() => handleToggle("push_notifications", pushNotif, setPushNotif)}>
                <div>
                  <p className="font-body-md text-body-md text-on-surface font-semibold">Push Notifications</p>
                  <p className="font-caption text-caption text-secondary">Receive real-time updates on your device.</p>
                </div>
                <label className="toggle-switch shrink-0 pointer-events-none">
                  <input type="checkbox" checked={pushNotif} readOnly />
                  <span className="slider"></span>
                </label>
              </div>

              {/* Email Digest */}
              <div className="flex justify-between items-center py-2 cursor-pointer" 
                onClick={() => handleToggle("email_digest", emailDigest, setEmailDigest)}>
                <div>
                  <p className="font-body-md text-body-md text-on-surface font-semibold">Email Digest</p>
                  <p className="font-caption text-caption text-secondary">A weekly curation of your top stories.</p>
                </div>
                <label className="toggle-switch shrink-0 pointer-events-none">
                  <input type="checkbox" checked={emailDigest} readOnly />
                  <span className="slider"></span>
                </label>
              </div>

              {/* Direct Messages */}
              <div className="flex justify-between items-center py-2 cursor-pointer" 
                onClick={() => handleToggle("direct_messages", directMsg, setDirectMsg)}>
                <div>
                  <p className="font-body-md text-body-md text-on-surface font-semibold">Direct Messages</p>
                  <p className="font-caption text-caption text-secondary">Notification for new private conversations.</p>
                </div>
                <label className="toggle-switch shrink-0 pointer-events-none">
                  <input type="checkbox" checked={directMsg} readOnly />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </section>

          {/* Section: Legacy Premium (Account Upgrade) */}
          <section className="bg-surface-container-low p-stack-md border border-outline-variant rounded-sm relative overflow-hidden shadow-sm">
            {upgradeSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 bg-primary text-on-primary rounded-full flex items-center justify-center mx-auto">
                  <Sparkles size={24} />
                </div>
                <h3 className="font-serif font-bold text-xl text-primary">Legacy Status Activated</h3>
                <p className="text-secondary text-sm">
                  You are now verified and upgraded to a Legacy Creator. A badge has been added to your profile.
                </p>
              </div>
            ) : (
              <>
                <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none translate-x-12 -translate-y-12">
                  <img
                    className="w-full h-full object-cover rounded-full"
                    src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80"
                    alt=""
                  />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="fill-current text-[#B8860B]" size={20} />
                    <h3 className="font-label-md text-label-md text-primary uppercase tracking-widest">
                      The Legacy Badge
                    </h3>
                  </div>
                  <p className="font-display-md text-[24px] text-primary mb-4 leading-tight">
                    Elevate your presence within the Stack community.
                  </p>
                  <ul className="space-y-2 mb-8 text-secondary font-body-md">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="text-primary mt-1 shrink-0" size={14} />
                      <span>Exclusive typography sets for your posts.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="text-primary mt-1 shrink-0" size={14} />
                      <span>Verified status badge for all public interactions.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="text-primary mt-1 shrink-0" size={14} />
                      <span>Zero advertising across the entire ecosystem.</span>
                    </li>
                  </ul>
                  <button onClick={handleUpgradeToLegacy} disabled={isUpgrading || profile?.is_legacy}
                    className="w-full bg-primary text-on-primary py-4 px-8 font-label-md uppercase tracking-widest hover:opacity-90 active:scale-98 transition-all cursor-pointer font-bold flex items-center justify-center gap-2">
                    {isUpgrading ? <Loader2 className="animate-spin" size={16} /> : profile?.is_legacy ? "Already Upgraded" : "Upgrade to Legacy"}
                  </button>
                </div>
              </>
            )}
          </section>

          {/* Section: Privacy & Security */}
          <section className="space-y-4">
            <h3 className="font-label-md text-label-md text-primary uppercase tracking-widest border-b border-outline-variant/20 pb-2">
              Privacy &amp; Security
            </h3>
            <div className="divide-y divide-outline-variant/30 text-left">
              <div onClick={() => setShowPrivacyModal(true)} className="group flex justify-between items-center py-4 hover:px-2 transition-all cursor-pointer">
                <span className="font-body-md text-body-md text-on-surface group-hover:text-primary transition-colors">
                  Account Privacy
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-caption text-secondary/60 text-xs">
                    {isPrivate ? "Private" : "Public"}
                  </span>
                  <ChevronRight className="text-secondary group-hover:translate-x-1 transition-transform" size={20} />
                </div>
              </div>
              <div onClick={() => setShowBlockedModal(true)} className="group flex justify-between items-center py-4 hover:px-2 transition-all cursor-pointer">
                <span className="font-body-md text-body-md text-on-surface group-hover:text-primary transition-colors">
                  Blocked Accounts
                </span>
                <ChevronRight className="text-secondary group-hover:translate-x-1 transition-transform" size={20} />
              </div>
            </div>
          </section>

          {/* Section: Appearance */}
          <section className="space-y-4">
            <h3 className="font-label-md text-label-md text-primary uppercase tracking-widest border-b border-outline-variant/20 pb-2">
              Appearance
            </h3>
            <div className="space-y-gutter">
              {/* Dark Mode Toggle */}
              <div className="flex justify-between items-center py-2 cursor-pointer" onClick={handleDarkModeToggle}>
                <div>
                  <p className="font-body-md text-body-md text-on-surface font-semibold">Dark Mode</p>
                  <p className="font-caption text-caption text-secondary">Switch to a dark color palette for evening browsing.</p>
                </div>
                <label className="toggle-switch shrink-0 pointer-events-none">
                  <input type="checkbox" checked={darkMode} readOnly />
                  <span className="slider"></span>
                </label>
              </div>

              {/* Reduced Motion */}
              <div className="flex justify-between items-center py-2 cursor-pointer" 
                onClick={() => handleToggle("reduced_motion", reducedMotion, setReducedMotion)}>
                <div>
                  <p className="font-body-md text-body-md text-on-surface font-semibold">Reduced Motion</p>
                  <p className="font-caption text-caption text-secondary">Minimizes animations for a calmer experience.</p>
                </div>
                <label className="toggle-switch shrink-0 pointer-events-none">
                  <input type="checkbox" checked={reducedMotion} readOnly />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </section>

          {/* Logout / Danger Zone */}
          <section className="pt-stack-md border-t border-outline-variant flex flex-col items-center gap-4">
            <button
              onClick={handleLogout}
              className="text-error font-label-md uppercase tracking-widest hover:underline underline-offset-8 active:scale-95 transition-transform cursor-pointer"
            >
              Logout from all devices
            </button>
            <p className="font-caption text-caption text-secondary">
              Stack Social Version 4.2.1 • © 2024
            </p>
          </section>
        </div>
      </div>

      {/* Account Privacy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-fade-in">
          <div className="bg-surface border border-outline-variant max-w-sm w-full p-6 md:p-8 rounded-sm relative space-y-6 shadow-2xl">
            <button onClick={() => setShowPrivacyModal(false)} className="absolute top-4 right-4 text-secondary hover:text-primary cursor-pointer">
              <X size={20} />
            </button>
            <div className="text-center space-y-2">
              <h3 className="font-serif font-bold text-2xl text-primary uppercase">Account Privacy</h3>
              <p className="font-caption text-secondary/80 leading-normal">
                Choose who can view your posts and reels.
              </p>
            </div>
            <div className="space-y-4">
              <div
                onClick={() => handleToggle("is_private", isPrivate, setIsPrivate)}
                className="flex items-center justify-between p-4 bg-surface-container-low border border-outline-variant/30 hover:border-primary rounded-lg cursor-pointer transition-all animate-fade-in"
              >
                <div className="text-left pr-4">
                  <p className="font-bold text-xs uppercase tracking-wider text-primary">Private Account</p>
                  <p className="font-caption text-secondary/80 text-[10px] mt-1 leading-normal">
                    Only approved followers can view your visual journal. Other curators must follow you to view content.
                  </p>
                </div>
                <label className="toggle-switch shrink-0 pointer-events-none">
                  <input type="checkbox" checked={isPrivate} readOnly />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="text-center">
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="px-6 py-2.5 bg-primary text-on-primary font-label-md text-xs uppercase tracking-widest font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Accounts Modal */}
      {showBlockedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-outline-variant max-w-md w-full p-6 md:p-8 rounded-sm relative space-y-6 shadow-2xl flex flex-col max-h-[80vh] select-none">
            <button onClick={() => setShowBlockedModal(false)} className="absolute top-4 right-4 text-secondary hover:text-primary cursor-pointer">
              <X size={20} />
            </button>
            <div className="text-center space-y-2 shrink-0">
              <h3 className="font-serif font-bold text-2xl text-primary uppercase">Blocked Accounts</h3>
              <p className="font-caption text-secondary/80 leading-normal">
                When you block someone, they won't be able to view your profile, posts, or message you.
              </p>
            </div>

            {/* Block Search Input */}
            <div className="relative shrink-0 animate-fade-in">
              <input
                type="text"
                value={searchBlockQuery}
                onChange={(e) => setSearchBlockQuery(e.target.value)}
                placeholder="Search curators to block..."
                className="w-full bg-surface-container-low border border-outline-variant px-4 py-2.5 text-xs rounded-xl focus:outline-none focus:border-primary text-primary"
              />
              {searchBlockQuery.trim() && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-outline-variant rounded-sm shadow-xl z-50 p-2 max-h-48 overflow-y-auto space-y-2">
                  {searchingBlock ? (
                    <div className="flex justify-center p-2">
                      <Loader2 className="animate-spin text-secondary" size={14} />
                    </div>
                  ) : searchBlockResults.length === 0 ? (
                    <p className="text-[10px] text-secondary text-center p-2">No creators found</p>
                  ) : (
                    searchBlockResults.map((res) => {
                      const isAlreadyBlocked = blockedUsers.some(b => b.blocked_id === res.id);
                      return (
                        <div key={res.id} className="flex items-center justify-between p-2 hover:bg-surface-container-low rounded-lg transition-all">
                          <div className="flex items-center gap-2">
                            <img src={res.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(res.display_name || "U")}&background=1A1A1A&color=fff`}
                              className="w-7 h-7 rounded-full object-cover shrink-0" alt="" />
                            <div className="text-left">
                              <p className="text-xs font-bold text-primary leading-tight">{res.display_name}</p>
                              <p className="text-[10px] text-secondary">@{res.username}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => !isAlreadyBlocked && handleBlockUser(res)}
                            disabled={isAlreadyBlocked}
                            className={`px-3 py-1 rounded text-[9px] uppercase font-bold tracking-wider transition-all ${
                              isAlreadyBlocked ? "bg-surface-container text-secondary cursor-default" : "bg-error text-on-error hover:opacity-90 cursor-pointer"
                            }`}
                          >
                            {isAlreadyBlocked ? "Blocked" : "Block"}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Blocked Users List */}
            <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar py-2 border-t border-outline-variant/20">
              {loadingBlocked ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-secondary" size={20} />
                </div>
              ) : blockedUsers.length === 0 ? (
                <p className="text-center text-xs text-secondary/60 italic py-12 animate-fade-in">No blocked curators.</p>
              ) : (
                blockedUsers.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-2 bg-surface-container-low/55 rounded-lg border border-outline-variant/10 animate-fade-in">
                    <div className="flex items-center gap-3">
                      <img src={b.blocked_profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.blocked_profile?.display_name || "U")}&background=1A1A1A&color=fff`}
                        className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
                      <div className="text-left">
                        <p className="font-bold text-xs text-primary leading-tight">{b.blocked_profile?.display_name}</p>
                        <p className="text-[10px] text-secondary">@{b.blocked_profile?.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnblockUser(b.id)}
                      className="px-3 py-1.5 border border-primary text-primary text-[9px] uppercase font-bold tracking-widest hover:bg-primary hover:text-on-primary transition-all cursor-pointer font-bold"
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
