"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { Heart, UserPlus, MessageSquare, Bookmark, Check, X, ShieldAlert, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export default function NotificationsPage() {
  const containerRef = useRef(null);
  const { user } = useAuth();

  const [followRequests, setFollowRequests] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch pending follow requests and notifications
  const loadNotifications = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // 1. Fetch pending follow requests
      const { data: requestsData } = await supabase
        .from("follows")
        .select("id, status, created_at, follower:profiles!follower_id(id, display_name, username, avatar_url, role)")
        .eq("following_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      setFollowRequests(requestsData || []);

      // 2. Fetch general activities/notifications
      const { data: activitiesData } = await supabase
        .from("notifications")
        .select("id, type, message, is_read, created_at, actor:profiles!actor_id(id, display_name, username, avatar_url), post:posts!post_id(id, caption, media_urls, media_type)")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(40);

      setActivities(activitiesData || []);

      // 3. Mark fetched notifications as read
      const unreadIds = (activitiesData || []).filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length > 0) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .in("id", unreadIds);
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      setLoading(false);
    }
  }, [loadNotifications, user]);

  // Realtime subscription for incoming notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          // Fetch full actor details for the inserted record
          const { data: fullNotification } = await supabase
            .from("notifications")
            .select("id, type, message, is_read, created_at, actor:profiles!actor_id(id, display_name, username, avatar_url), post:posts!post_id(id, caption, media_urls, media_type)")
            .eq("id", payload.new.id)
            .single();

          if (fullNotification) {
            setActivities((prev) => [fullNotification, ...prev]);
            // Mark as read
            await supabase.from("notifications").update({ is_read: true }).eq("id", fullNotification.id);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "follows",
          filter: `following_id=eq.${user.id}`,
        },
        async (payload) => {
          if (payload.new.status === "pending") {
            const { data: fullFollow } = await supabase
              .from("follows")
              .select("id, status, created_at, follower:profiles!follower_id(id, display_name, username, avatar_url, role)")
              .eq("id", payload.new.id)
              .single();

            if (fullFollow) {
              setFollowRequests((prev) => [fullFollow, ...prev]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // GSAP animations
  useEffect(() => {
    if (loading || !containerRef.current) return;
    const ctx = gsap.context(() => {
      const isMobile = window.innerWidth < 768;
      gsap.from(".anim-section", {
        opacity: 0,
        y: isMobile ? 10 : 20,
        stagger: isMobile ? 0.04 : 0.1,
        duration: isMobile ? 0.4 : 0.6,
        ease: "power2.out",
      });
      if (followRequests.length > 0 || activities.length > 0) {
        gsap.from(".anim-item", {
          opacity: 0,
          y: isMobile ? 8 : 15,
          stagger: isMobile ? 0.015 : 0.03,
          duration: isMobile ? 0.35 : 0.5,
          ease: "power2.out",
          delay: isMobile ? 0.05 : 0.1,
        });
      }
    }, containerRef.current);

    return () => ctx.revert();
  }, [loading, followRequests.length, activities.length]);

  // Handle follow requests (Accept/Decline)
  const handleFollowResponse = async (reqId, accepted) => {
    const item = document.getElementById(`request-${reqId}`);
    if (item) {
      gsap.to(item, {
        opacity: 0,
        x: accepted ? 30 : -30,
        height: 0,
        padding: 0,
        marginTop: 0,
        marginBottom: 0,
        borderWidth: 0,
        duration: 0.4,
        ease: "power2.inOut",
        onComplete: async () => {
          try {
            if (accepted) {
              // Update status to accepted
              await supabase
                .from("follows")
                .update({ status: "accepted" })
                .eq("id", reqId);

              // Notify the user that request was accepted
              const acceptedRequest = followRequests.find((r) => r.id === reqId);
              if (acceptedRequest && user) {
                await supabase.from("notifications").insert({
                  recipient_id: acceptedRequest.follower.id,
                  actor_id: user.id,
                  type: "follow",
                  message: "accepted your follow request.",
                });
              }
            } else {
              // Decline / Delete request
              await supabase
                .from("follows")
                .delete()
                .eq("id", reqId);
            }
            setFollowRequests((prev) => prev.filter((r) => r.id !== reqId));
          } catch (err) {
            console.error("Error responding to follow request:", err);
          }
        },
      });
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen flex flex-col items-center justify-start pt-8 pb-stack-lg bg-brand-ivory text-primary w-full"
    >
      <div className="w-full max-w-[720px] mx-auto px-margin-mobile md:px-margin-desktop py-4 flex flex-col items-center">
        {/* Header */}
        <header className="mb-stack-lg border-b border-outline-variant/30 pb-6 anim-section w-full text-center flex flex-col items-center">
          <h1 className="font-serif font-black text-[32px] sm:text-5xl md:text-7xl text-primary mb-4 tracking-tight leading-tight uppercase">
            Notifications
          </h1>
          <p className="font-body-lg text-body-lg text-secondary max-w-xl leading-relaxed">
            Keep track of follow requests, likes, and comments on your curation feed.
          </p>
        </header>

        <div className="space-y-stack-lg select-none w-full">
          {/* Section: Follow Requests */}
          <section className="space-y-4 anim-section">
            <h3 className="font-label-md text-label-md text-primary uppercase tracking-widest border-b border-outline-variant/20 pb-2 flex justify-between items-center">
              <span>Follow Requests</span>
              {followRequests.length > 0 && (
                <span className="bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 font-sans">
                  {followRequests.length} Pending
                </span>
              )}
            </h3>

            {followRequests.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-outline-variant rounded-lg bg-surface-container-lowest/30">
                <p className="font-body-md text-secondary italic">No pending follow requests</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {followRequests.map((req) => (
                  <div
                    key={req.id}
                    id={`request-${req.id}`}
                    className="anim-item bg-surface-container-low border border-outline-variant p-4 rounded-xl flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    {/* Requester Avatar */}
                    <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-outline-variant bg-surface-container">
                      <img
                        alt={req.follower?.display_name}
                        className="w-full h-full object-cover"
                        src={req.follower?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.follower?.display_name || "U")}&background=1A1A1A&color=fff`}
                      />
                    </div>
                    {/* Requester Info */}
                    <div className="min-w-0 flex-1">
                      <p className="font-body-md font-bold text-sm md:text-base text-primary truncate leading-tight">{req.follower?.display_name}</p>
                      <p className="font-caption text-[10px] md:text-caption text-secondary truncate mt-0.5">@{req.follower?.username}</p>
                    </div>
                    {/* Accept/Decline Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleFollowResponse(req.id, true)}
                        className="w-9 h-9 rounded-full bg-primary text-on-primary hover:opacity-90 active:scale-90 flex items-center justify-center transition-all cursor-pointer"
                        title="Accept Request"
                      >
                        <Check size={18} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => handleFollowResponse(req.id, false)}
                        className="w-9 h-9 rounded-full border border-outline-variant text-secondary hover:bg-surface-container-high hover:text-primary active:scale-90 flex items-center justify-center transition-all cursor-pointer"
                        title="Decline Request"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section: Recent Activity */}
          <section className="space-y-4 anim-section">
            <h3 className="font-label-md text-label-md text-primary uppercase tracking-widest border-b border-outline-variant/20 pb-2">
              Recent Activity
            </h3>

            {activities.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-outline-variant rounded-lg bg-surface-container-lowest/30">
                <p className="font-body-md text-secondary italic">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/30 bg-surface border border-outline-variant rounded-sm overflow-hidden shadow-sm">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="anim-item flex items-start gap-4 p-5 hover:bg-surface-container-low transition-colors duration-300 relative"
                  >
                    {/* Activity Icon Badges */}
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full overflow-hidden border border-outline-variant bg-surface-container">
                        <img
                          alt={act.actor?.display_name}
                          className="w-full h-full object-cover"
                          src={act.actor?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(act.actor?.display_name || "U")}&background=1A1A1A&color=fff`}
                        />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border border-surface text-white bg-primary shadow-sm">
                        {act.type === "like" && <Heart size={10} className="fill-current text-white" />}
                        {act.type === "comment" && <MessageSquare size={10} className="text-white" />}
                        {act.type === "follow" && <UserPlus size={10} className="text-white" />}
                        {act.type === "bookmark" && <Bookmark size={10} className="text-white" />}
                      </div>
                    </div>

                    {/* Activity Content Text */}
                    <div className="flex-1 min-w-0">
                      <p className="font-body-md text-sm md:text-base text-primary">
                        <span className="font-semibold cursor-pointer hover:underline">{act.actor?.display_name}</span>{" "}
                        <span className="text-secondary">{act.message}</span>
                      </p>

                      <span className="font-caption text-[10px] md:text-caption text-secondary/60 mt-1.5 block">
                        {timeAgo(act.created_at)}
                      </span>
                    </div>

                    {/* Optional Post Thumbnail Preview */}
                    {act.post?.media_urls?.[0] && (
                      <div className="w-12 h-15 rounded-md overflow-hidden bg-surface-container border border-outline-variant/30 cursor-pointer shrink-0 hover:opacity-90 transition-opacity">
                        {act.post.media_type === "video" ? (
                          <video src={act.post.media_urls[0]} className="w-full h-full object-cover" muted playsInline />
                        ) : (
                          <img
                            alt="Post Preview"
                            className="w-full h-full object-cover"
                            src={act.post.media_urls[0]}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
