"use client";

import { useEffect, useRef, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import gsap from "gsap";
import { Link2, Share2, Edit3, Grid, Film, Bookmark, X, Loader2, Lock, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import StoryViewer from "@/components/StoryViewer";
import PostDetailModal from "@/components/PostDetailModal";

function ProfileSkeleton() {
  return (
    <div className="min-h-screen pb-stack-lg relative animate-pulse">
      {/* Cover Image Shimmer */}
      <section className="relative h-[240px] md:h-[350px] w-full overflow-hidden bg-surface-container animate-shimmer" />

      {/* Profile Info Header */}
      <section className="px-margin-mobile md:px-margin-desktop -mt-16 relative z-10 max-w-screen-xl mx-auto">
        <div className="bg-surface p-stack-md border border-outline-variant rounded-sm">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-gutter">
            <div className="flex flex-col gap-unit">
              {/* Avatar Shimmer */}
              <div className="relative shrink-0 -mt-24 w-32 h-32 rounded-full border-4 border-surface overflow-hidden bg-surface-container animate-shimmer" />
              {/* Name and Bio Skeletons */}
              <div className="w-48 h-6 rounded bg-surface-container animate-shimmer mt-stack-sm" />
              <div className="w-24 h-3 rounded bg-surface-container-low animate-shimmer mt-2" />
              <div className="w-64 h-3.5 rounded bg-surface-container-low animate-shimmer mt-4" />
              <div className="w-40 h-3 rounded bg-surface-container-low animate-shimmer mt-2" />
            </div>

            {/* Stats Shimmer */}
            <div className="flex gap-stack-md mb-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center md:text-right">
                  <div className="w-12 h-5 rounded bg-surface-container animate-shimmer mx-auto md:ml-auto" />
                  <div className="w-16 h-3 rounded bg-surface-container-low animate-shimmer mt-2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tab Area Shimmer */}
      <section className="px-margin-mobile md:px-margin-desktop mt-stack-md max-w-screen-xl mx-auto">
        <div className="border-b border-outline-variant/30 pb-2 flex gap-6">
          <div className="w-16 h-4 rounded bg-surface-container animate-shimmer" />
          <div className="w-16 h-4 rounded bg-surface-container animate-shimmer" />
          <div className="w-16 h-4 rounded bg-surface-container animate-shimmer" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-[4/5] bg-surface-container animate-shimmer rounded-sm" />
          ))}
        </div>
      </section>
    </div>
  );
}

function ProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const profileId = searchParams.get("id");
  const { user, profile: currentUserProfile, updateProfile } = useAuth();

  const containerRef = useRef(null);
  const tabLineRef = useRef(null);
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("Posts");
  const [profileUser, setProfileUser] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  // Stats
  const [postCount, setPostCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  // Tabs content
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);

  // Edit Profile Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editRole, setEditRole] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Stories state
  const [activeStories, setActiveStories] = useState([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);

  // Post detail modal & synced interactions
  const [selectedPost, setSelectedPost] = useState(null);
  const [likedPosts, setLikedPosts] = useState({});
  const [bookmarkedPosts, setBookmarkedPosts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [commentCounts, setCommentCounts] = useState({});

  const [isBlocked, setIsBlocked] = useState(false);

  // Followers & Following Modals State
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);
  const [followListSearch, setFollowListSearch] = useState("");

  const fetchFollowersList = async () => {
    const targetId = profileId || user?.id;
    if (!targetId) return;
    setLoadingFollowList(true);
    try {
      const { data, error } = await supabase
        .from("follows")
        .select(`
          id,
          follower:profiles!follower_id (
            id,
            display_name,
            username,
            avatar_url,
            bio,
            role
          )
        `)
        .eq("following_id", targetId);

      if (error) throw error;
      const list = (data || [])
        .map((item) => item.follower)
        .filter(Boolean);
      setFollowersList(list);
    } catch (err) {
      console.error("Error fetching followers list:", err);
    } finally {
      setLoadingFollowList(false);
    }
  };

  const fetchFollowingList = async () => {
    const targetId = profileId || user?.id;
    if (!targetId) return;
    setLoadingFollowList(true);
    try {
      const { data, error } = await supabase
        .from("follows")
        .select(`
          id,
          following:profiles!following_id (
            id,
            display_name,
            username,
            avatar_url,
            bio,
            role
          )
        `)
        .eq("follower_id", targetId);

      if (error) throw error;
      const list = (data || [])
        .map((item) => item.following)
        .filter(Boolean);
      setFollowingList(list);
    } catch (err) {
      console.error("Error fetching following list:", err);
    } finally {
      setLoadingFollowList(false);
    }
  };

  // Load profile user details
  const loadProfile = useCallback(async () => {
    setLoading(true);
    const targetId = profileId || user?.id;
    if (!targetId) {
      setLoading(false);
      return;
    }

    const isOwn = targetId === user?.id;
    setIsOwnProfile(isOwn);

    try {
      // Parallelize all independent database queries for profile details
      const profilePromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", targetId)
        .single();

      const followersPromise = supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", targetId);

      const followingPromise = supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", targetId);

      const followRelPromise = (!isOwn && user)
        ? supabase.from("follows").select("*").eq("follower_id", user.id).eq("following_id", targetId).maybeSingle()
        : Promise.resolve({ data: null });

      const blockRelPromise = (user && !isOwn)
        ? supabase.from("blocks").select("*").or(`and(blocker_id.eq.${user.id},blocked_id.eq.${targetId}),and(blocker_id.eq.${targetId},blocked_id.eq.${user.id})`).maybeSingle()
        : Promise.resolve({ data: null });

      const storiesPromise = supabase
        .from("posts")
        .select("*, author:profiles!author_id(id, display_name, username, avatar_url)")
        .eq("author_id", targetId)
        .eq("type", "story")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });

      const [
        profileRes,
        followersRes,
        followingRes,
        followRelRes,
        blockRelRes,
        storiesRes
      ] = await Promise.all([
        profilePromise,
        followersPromise,
        followingPromise,
        followRelPromise,
        blockRelPromise,
        storiesPromise
      ]);

      if (profileRes.error) throw profileRes.error;
      const pUser = profileRes.data;
      setProfileUser(pUser);

      // Populate edit fields
      if (isOwn) {
        setEditDisplayName(pUser.display_name || "");
        setEditUsername(pUser.username || "");
        setEditBio(pUser.bio || "");
        setEditWebsite(pUser.website || "");
        setEditRole(pUser.role || "");
      }

      setFollowerCount(followersRes.count || 0);
      setFollowingCount(followingRes.count || 0);
      setIsFollowing(!!followRelRes.data);
      setIsBlocked(!!blockRelRes.data);
      setActiveStories(storiesRes.data || []);
    } catch (err) {
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  }, [profileId, user]);

  useEffect(() => {
    setShowFollowersModal(false);
    setShowFollowingModal(false);
    loadProfile();
  }, [profileId, loadProfile]);

  // Load Tab Content (Posts, Reels, Saved)
  const loadTabContent = useCallback(async () => {
    const targetId = profileId || user?.id;
    if (!targetId) return;

    const isOwn = targetId === user?.id;
    // Skip loading if locked private profile
    if (profileUser?.is_private && !isOwn && !isFollowing) {
      setItems([]);
      setItemsLoading(false);
      return;
    }

    setItemsLoading(true);
    try {
      let fetchedItems = [];
      if (activeTab === "Posts") {
        const { data } = await supabase
          .from("posts")
          .select("*, author:profiles!author_id(id, display_name, username, avatar_url, role)")
          .eq("author_id", targetId)
          .eq("type", "post")
          .order("created_at", { ascending: false });
        fetchedItems = data || [];
        setPostCount(fetchedItems.length);
      } else if (activeTab === "Reels") {
        const { data } = await supabase
          .from("posts")
          .select("*, author:profiles!author_id(id, display_name, username, avatar_url, role)")
          .eq("author_id", targetId)
          .eq("type", "reel")
          .order("created_at", { ascending: false });
        fetchedItems = data || [];
      } else if (activeTab === "Saved") {
        const { data } = await supabase
          .from("bookmarks")
          .select("*, post:posts(*, author:profiles!author_id(id, display_name, username, avatar_url, role))")
          .eq("user_id", targetId)
          .order("created_at", { ascending: false });
        fetchedItems = (data || []).map((b) => b.post).filter(Boolean);
      }

      setItems(fetchedItems);

      // Fetch user's likes & bookmarks for these items, and counts in parallel
      if (fetchedItems.length > 0 && user) {
        const postIds = fetchedItems.map((p) => p.id);

        const [
          userLikesResult,
          userBookmarksResult,
          likesDataResult,
          commentsDataResult
        ] = await Promise.all([
          supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds),
          supabase.from("bookmarks").select("post_id").eq("user_id", user.id).in("post_id", postIds),
          supabase.from("likes").select("post_id").in("post_id", postIds),
          supabase.from("comments").select("post_id").in("post_id", postIds)
        ]);

        const userLikes = userLikesResult.data || [];
        const userBookmarks = userBookmarksResult.data || [];
        const likesData = likesDataResult.data || [];
        const commentsData = commentsDataResult.data || [];

        const likedMap = {};
        userLikes.forEach((l) => (likedMap[l.post_id] = true));
        setLikedPosts((prev) => ({ ...prev, ...likedMap }));

        const bookmarkedMap = {};
        userBookmarks.forEach((b) => (bookmarkedMap[b.post_id] = true));
        setBookmarkedPosts((prev) => ({ ...prev, ...bookmarkedMap }));

        const counts = {};
        likesData.forEach((l) => {
          counts[l.post_id] = (counts[l.post_id] || 0) + 1;
        });
        setLikeCounts((prev) => ({ ...prev, ...counts }));

        const cCounts = {};
        commentsData.forEach((c) => {
          cCounts[c.post_id] = (cCounts[c.post_id] || 0) + 1;
        });
        setCommentCounts((prev) => ({ ...prev, ...cCounts }));
      }
    } catch (err) {
      console.error("Tab fetch error:", err);
    } finally {
      setItemsLoading(false);
    }
  }, [activeTab, profileId, user, profileUser?.is_private, isFollowing]);

  useEffect(() => {
    loadTabContent();
  }, [loadTabContent]);

  const deepLinkPostId = searchParams.get("post");

  // Load deep-linked post if present in URL
  useEffect(() => {
    if (!deepLinkPostId || !user) return;

    async function loadDeepLinkPost() {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("*, author:profiles!author_id(id, display_name, username, avatar_url, role)")
          .eq("id", deepLinkPostId)
          .single();

        if (error) throw error;
        if (data) {
          // Fetch its interactions specifically so it doesn't break in detail modal
          const { count: likeCount } = await supabase
            .from("likes")
            .select("*", { count: "exact", head: true })
            .eq("post_id", deepLinkPostId);

          const { data: userLike } = await supabase
            .from("likes")
            .select("*")
            .eq("user_id", user.id)
            .eq("post_id", deepLinkPostId)
            .maybeSingle();

          const { data: userBookmark } = await supabase
            .from("bookmarks")
            .select("*")
            .eq("user_id", user.id)
            .eq("post_id", deepLinkPostId)
            .maybeSingle();

          setLikedPosts((prev) => ({ ...prev, [deepLinkPostId]: !!userLike }));
          setBookmarkedPosts((prev) => ({ ...prev, [deepLinkPostId]: !!userBookmark }));
          setLikeCounts((prev) => ({ ...prev, [deepLinkPostId]: likeCount || 0 }));

          setSelectedPost(data);
        }
      } catch (err) {
        console.error("Error loading deep link post:", err);
      }
    }

    loadDeepLinkPost();
  }, [deepLinkPostId, user]);

  // Toggle like
  const toggleLike = async (postId) => {
    if (!user) return;
    const isLiked = likedPosts[postId];

    // Optimistic update
    setLikedPosts((prev) => ({ ...prev, [postId]: !isLiked }));
    setLikeCounts((prev) => ({ ...prev, [postId]: (prev[postId] || 0) + (isLiked ? -1 : 1) }));

    try {
      if (isLiked) {
        await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", postId);
      } else {
        await supabase.from("likes").insert({ user_id: user.id, post_id: postId });
      }
    } catch {
      // Revert on error
      setLikedPosts((prev) => ({ ...prev, [postId]: isLiked }));
      setLikeCounts((prev) => ({ ...prev, [postId]: (prev[postId] || 0) + (isLiked ? 1 : -1) }));
    }
  };

  // Toggle bookmark
  const toggleBookmark = async (postId) => {
    if (!user) return;
    const isBookmarked = bookmarkedPosts[postId];

    setBookmarkedPosts((prev) => ({ ...prev, [postId]: !isBookmarked }));

    try {
      if (isBookmarked) {
        await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("post_id", postId);
      } else {
        await supabase.from("bookmarks").insert({ user_id: user.id, post_id: postId });
      }
      // If on Saved tab and we untoggle, remove it from list
      if (isBookmarked && activeTab === "Saved") {
        setItems((prev) => prev.filter((item) => item.id !== postId));
      }
    } catch {
      setBookmarkedPosts((prev) => ({ ...prev, [postId]: isBookmarked }));
    }
  };

  // Entrance Animations
  useEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      gsap.from(".profile-header-card", {
        y: 60,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
      });
    }, containerRef);
    return () => ctx.revert();
  }, [loading]);

  useEffect(() => {
    if (itemsLoading) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".post-grid-item",
        { scale: 0.95, opacity: 0 },
        { scale: 1, opacity: 1, stagger: 0.05, duration: 0.6, ease: "power2.out" }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [itemsLoading]);

  // Tab change
  const handleTabClick = (tabName, event) => {
    setActiveTab(tabName);
    const target = event.currentTarget;
    const { offsetLeft, offsetWidth } = target;

    gsap.to(tabLineRef.current, {
      left: offsetLeft,
      width: offsetWidth,
      duration: 0.35,
      ease: "power2.inOut",
    });
  };

  // Follow/Unfollow
  const handleFollowToggle = async () => {
    if (!user || !profileUser) return;

    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setFollowerCount((prev) => prev + (nextState ? 1 : -1));

    try {
      if (nextState) {
        await supabase.from("follows").insert({
          follower_id: user.id,
          following_id: profileUser.id,
          status: "accepted",
        });

        // Send notification
        await supabase.from("notifications").insert({
          recipient_id: profileUser.id,
          actor_id: user.id,
          type: "follow",
          message: "started following you.",
        });
      } else {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profileUser.id);
      }
    } catch (err) {
      console.error("Follow error:", err);
      // revert
      setIsFollowing(!nextState);
      setFollowerCount((prev) => prev + (nextState ? -1 : 1));
    }
  };

  // Share profile
  const handleShareProfile = () => {
    const link = `${window.location.origin}/profile?id=${profileUser?.id}`;
    navigator.clipboard.writeText(link);
    alert("Profile link copied to clipboard!");
  };

  // Save profile updates
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      await updateProfile({
        display_name: editDisplayName,
        username: editUsername,
        bio: editBio,
        website: editWebsite,
        role: editRole,
      });

      // Reload state
      setProfileUser((prev) => ({
        ...prev,
        display_name: editDisplayName,
        username: editUsername,
        bio: editBio,
        website: editWebsite,
        role: editRole,
      }));

      setShowEditModal(false);
    } catch (err) {
      console.error("Profile save error:", err);
      alert(err.message || "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Avatar Upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload image to profiles bucket
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public url
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // Update profile DB table
      await updateProfile({ avatar_url: publicUrl });

      setProfileUser((prev) => ({
        ...prev,
        avatar_url: publicUrl,
      }));
    } catch (err) {
      console.error("Avatar upload error:", err);
      alert(err.message || "Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Cover Upload
  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingCover(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/cover.${fileExt}`;

      // Upload image to profiles bucket
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public url
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // Update profile DB table
      await updateProfile({ cover_url: publicUrl });

      setProfileUser((prev) => ({
        ...prev,
        cover_url: publicUrl,
      }));
    } catch (err) {
      console.error("Cover upload error:", err);
      alert(err.message || "Failed to upload cover image.");
    } finally {
      setUploadingCover(false);
    }
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4 bg-brand-ivory text-brand-charcoal px-6">
        <p className="font-serif font-bold text-2xl text-primary">Profile Not Available</p>
        <p className="font-body-md text-secondary">This account details are not available.</p>
        <button onClick={() => router.push("/")} className="px-6 py-2.5 bg-brand-charcoal text-white font-label-md uppercase tracking-wider font-bold hover:opacity-85 transition-opacity cursor-pointer">
          Go Home
        </button>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <p className="font-serif font-bold text-2xl text-primary">Profile Not Found</p>
        <button onClick={() => router.push("/")} className="px-6 py-2.5 bg-primary text-on-primary font-label-md uppercase tracking-wider font-bold">
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen pb-stack-lg relative">
      {/* Cover Image */}
      <section className="relative h-[240px] md:h-[350px] w-full overflow-hidden bg-surface-container border-b border-outline-variant/30 group">
        <img
          alt="Cover"
          className="w-full h-full object-cover"
          src={profileUser.cover_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80"}
        />
        {isOwnProfile && (
          <button
            onClick={() => coverInputRef.current?.click()}
            className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white font-label-md text-xs uppercase tracking-widest px-4 py-2.5 rounded-full backdrop-blur-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer border border-white/20 shadow-md"
            title="Change Cover Photo"
          >
            {uploadingCover ? <Loader2 className="animate-spin" size={14} /> : <Edit3 size={14} />}
            <span>Change Cover</span>
          </button>
        )}
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
      </section>

      {/* Profile Info Header */}
      <section className="px-margin-mobile md:px-margin-desktop -mt-16 relative z-10 max-w-screen-xl mx-auto">
        <div className="profile-header-card bg-surface p-stack-md border border-outline-variant rounded-sm shadow-[0px_10px_30px_rgba(0,0,0,0.02)]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-gutter">
            <div className="flex flex-col gap-unit">
              {/* Avatar & Edit Button Container */}
              <div className="relative shrink-0 -mt-24 w-32 h-32">
                {/* Avatar Circle */}
                <div
                  onClick={() => {
                    if (activeStories.length > 0) {
                      setShowStoryViewer(true);
                    }
                  }}
                  className={`w-full h-full rounded-full border-4 border-surface overflow-hidden shadow-sm bg-surface-container relative group transition-all duration-300 ${activeStories.length > 0
                    ? "ring-4 ring-primary ring-offset-2 ring-offset-surface cursor-pointer hover:scale-102"
                    : ""
                    }`}
                >
                  <img
                    alt={profileUser.display_name}
                    className="w-full h-full object-cover"
                    src={profileUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser.display_name || "U")}&background=1A1A1A&color=fff`}
                  />
                </div>
                {/* Edit Button */}
                {isOwnProfile && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="absolute bottom-0 right-0 bg-primary text-on-primary p-2.5 rounded-full shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer z-20 flex items-center justify-center border-2 border-surface"
                    title="Change Profile Photo"
                  >
                    {uploadingAvatar ? <Loader2 className="animate-spin" size={14} /> : <Edit3 size={14} />}
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>

              <h1 className="font-display-lg text-display-lg text-primary mt-stack-sm leading-none flex items-center gap-2">
                {profileUser.display_name}
                {profileUser.is_verified && (
                  <span className="w-5 h-5 bg-primary text-on-primary rounded-full flex items-center justify-center text-[10px] font-bold">✓</span>
                )}
              </h1>
              <p className="font-caption text-caption text-secondary uppercase tracking-widest">@{profileUser.username}</p>

              {profileUser.bio ? (
                <p className="font-body-md text-secondary max-w-lg mt-2 leading-relaxed">
                  {profileUser.bio}
                </p>
              ) : (
                <p className="font-body-md text-secondary/40 italic max-w-lg mt-2 leading-relaxed">
                  No bio written yet.
                </p>
              )}

              {profileUser.website && (
                <a
                  href={profileUser.website.startsWith("http") ? profileUser.website : `https://${profileUser.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-label-md text-label-md text-primary hover:underline flex items-center gap-2 mt-2 uppercase"
                >
                  <Link2 size={14} className="shrink-0" />
                  {profileUser.website.replace(/(^\w+:|^)\/\//, "")}
                </a>
              )}
            </div>

            {/* Stats and Call Actions */}
            <div className="flex flex-col gap-stack-sm items-start md:items-end shrink-0">
              {/* Stats */}
              <div className="flex gap-stack-md mb-2">
                {[
                  { label: "Posts", count: postCount, clickable: false },
                  { label: "Followers", count: followerCount, clickable: true },
                  { label: "Following", count: followingCount, clickable: true },
                ].map((s) => {
                  const canClick = s.clickable && (isOwnProfile || !profileUser?.is_private || isFollowing);
                  return (
                    <div
                      key={s.label}
                      onClick={() => {
                        if (!canClick) return;
                        setFollowListSearch("");
                        if (s.label === "Followers") {
                          setShowFollowersModal(true);
                          fetchFollowersList();
                        } else if (s.label === "Following") {
                          setShowFollowingModal(true);
                          fetchFollowingList();
                        }
                      }}
                      className={`text-center md:text-right ${canClick
                        ? "cursor-pointer hover:opacity-75 select-none transition-all active:scale-95"
                        : ""
                        }`}
                    >
                      <p className="font-label-md text-[18px] text-primary leading-none font-bold">
                        {s.count}
                      </p>
                      <p className="font-caption text-caption text-secondary uppercase tracking-widest mt-1">
                        {s.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-unit flex-wrap">
                {isOwnProfile ? (
                  <>
                    <button onClick={() => setShowEditModal(true)}
                      className="bg-primary text-on-primary px-8 py-3 font-label-md text-label-md uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all cursor-pointer font-bold flex items-center gap-2">
                      <Edit3 size={14} /> Edit Profile
                    </button>
                    <button onClick={() => router.push("/settings")}
                      className="border border-outline-variant text-primary p-3 hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                      title="Settings">
                      <Settings size={20} />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={handleFollowToggle}
                      className={`px-8 py-3 font-label-md text-label-md uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all cursor-pointer font-bold ${isFollowing ? "border border-outline-variant text-primary" : "bg-primary text-on-primary"
                        }`}>
                      {isFollowing ? "Unfollow" : "Follow"}
                    </button>
                    <button onClick={() => router.push(`/messages?recipient=${profileUser.id}`)}
                      className="border border-primary text-primary px-8 py-3 font-label-md text-label-md uppercase tracking-widest hover:bg-surface-container-low active:scale-95 transition-all cursor-pointer">
                      Message
                    </button>
                  </>
                )}
                <button onClick={handleShareProfile}
                  className="border border-outline-variant text-primary p-3 hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center cursor-pointer">
                  <Share2 size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-stack-lg border-b border-outline-variant/40 mt-stack-lg relative select-none">
            {[
              { id: "Posts", icon: <Grid size={16} /> },
              { id: "Reels", icon: <Film size={16} /> },
              { id: "Saved", icon: <Bookmark size={16} /> },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={(e) => handleTabClick(tab.id, e)}
                  className={`px-2 py-4 font-label-md text-label-md uppercase tracking-widest transition-colors cursor-pointer relative flex items-center gap-2 ${isActive ? "text-primary font-bold" : "text-secondary hover:text-primary"
                    }`}
                >
                  {tab.icon}
                  {tab.id}
                  {tab.id === "Posts" && activeTab === "Posts" && (
                    <div
                      ref={tabLineRef}
                      className="absolute bottom-[-1px] left-0 w-full h-[1.5px] bg-primary rounded-t"
                    />
                  )}
                  {tab.id !== "Posts" && isActive && (
                    <div className="absolute bottom-[-1px] left-0 w-full h-[1.5px] bg-primary rounded-t" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Portfolio Post Grid */}
          {profileUser?.is_private && !isOwnProfile && !isFollowing ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-fade-in select-none">
              <div className="w-14 h-14 rounded-full border border-outline-variant/50 flex items-center justify-center text-secondary">
                <Lock className="text-secondary" size={24} />
              </div>
              <h3 className="font-serif font-bold text-lg text-primary uppercase">This Account is Private</h3>
              <p className="font-caption text-secondary max-w-xs leading-normal">
                Follow this curator to view their visual journal, reels, and curated saved sections.
              </p>
            </div>
          ) : itemsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4 select-none animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-[4/5] bg-surface-container animate-shimmer rounded-sm" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 text-secondary italic font-body-md">
              No content here yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4 select-none">
              {items.map((item) => (
                <div key={item.id}
                  onClick={() => setSelectedPost(item)}
                  className="post-grid-item aspect-[4/5] bg-surface-container overflow-hidden group cursor-pointer border border-outline-variant/20 hover:border-outline-variant rounded-sm relative">
                  {item.media_type === "video" ? (
                    <video src={item.media_urls?.[0]} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-out" muted playsInline />
                  ) : (
                    <img
                      alt={item.caption}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 hover:scale-102 transition-all duration-700 ease-out"
                      src={item.media_urls?.[0]}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant rounded-sm max-w-md w-full p-6 relative space-y-4">
            <button onClick={() => setShowEditModal(false)} className="absolute top-4 right-4 text-secondary hover:text-primary">
              <X size={20} />
            </button>
            <h3 className="font-serif font-bold text-xl text-primary">Edit Profile</h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1">
                <label className="font-label-md text-[10px] uppercase text-secondary">Display Name</label>
                <input type="text" value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} required
                  className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 text-body-md focus:outline-none focus:border-primary text-primary" />
              </div>
              <div className="space-y-1">
                <label className="font-label-md text-[10px] uppercase text-secondary">Username</label>
                <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} required
                  className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 text-body-md focus:outline-none focus:border-primary text-primary" />
              </div>
              <div className="space-y-1">
                <label className="font-label-md text-[10px] uppercase text-secondary">Role / Specialty</label>
                <input type="text" value={editRole} onChange={(e) => setEditRole(e.target.value)} placeholder="e.g. Architect, Visual Curator"
                  className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 text-body-md focus:outline-none focus:border-primary text-primary" />
              </div>
              <div className="space-y-1">
                <label className="font-label-md text-[10px] uppercase text-secondary">Website</label>
                <input type="text" value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} placeholder="www.example.com"
                  className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 text-body-md focus:outline-none focus:border-primary text-primary" />
              </div>
              <div className="space-y-1">
                <label className="font-label-md text-[10px] uppercase text-secondary">Bio</label>
                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3}
                  className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 text-body-md focus:outline-none focus:border-primary text-primary resize-none" />
              </div>
              <button type="submit" disabled={isSavingProfile}
                className="w-full bg-primary text-on-primary font-label-md py-3 rounded-full hover:opacity-90 active:scale-95 uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                {isSavingProfile ? <Loader2 className="animate-spin" size={18} /> : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Story Viewer Modal */}
      {showStoryViewer && (
        <StoryViewer
          stories={activeStories}
          initialIndex={0}
          onClose={() => setShowStoryViewer(false)}
          onStoryDeleted={(deletedId) => {
            setActiveStories((prev) => prev.filter((s) => s.id !== deletedId));
          }}
        />
      )}

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant rounded-sm max-w-md w-full p-6 relative flex flex-col max-h-[80vh] space-y-4 shadow-xl text-primary">
            <button
              onClick={() => setShowFollowersModal(false)}
              className="absolute top-4 right-4 text-secondary hover:text-primary cursor-pointer z-10"
            >
              <X size={20} />
            </button>
            <h3 className="font-serif font-bold text-xl text-primary">Followers</h3>

            <input
              type="text"
              placeholder="Search followers..."
              value={followListSearch}
              onChange={(e) => setFollowListSearch(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 text-body-md focus:outline-none focus:border-primary text-primary"
            />

            <div className="flex-1 overflow-y-auto space-y-3 min-h-[250px] pr-1">
              {loadingFollowList ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              ) : followersList.filter(item =>
                item.display_name?.toLowerCase().includes(followListSearch.toLowerCase()) ||
                item.username?.toLowerCase().includes(followListSearch.toLowerCase())
              ).length === 0 ? (
                <p className="text-center text-secondary py-12 italic font-body-md">
                  No followers found.
                </p>
              ) : (
                followersList
                  .filter(item =>
                    item.display_name?.toLowerCase().includes(followListSearch.toLowerCase()) ||
                    item.username?.toLowerCase().includes(followListSearch.toLowerCase())
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setShowFollowersModal(false);
                        router.push(`/profile?id=${item.id}`);
                      }}
                      className="flex items-center justify-between p-2 rounded-sm hover:bg-surface-container-low cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-surface-container">
                          <img
                            alt={item.display_name}
                            className="w-full h-full object-cover"
                            src={item.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.display_name || "U")}&background=1A1A1A&color=fff`}
                          />
                        </div>
                        <div className="text-left">
                          <p className="font-label-md text-primary font-bold leading-none">{item.display_name}</p>
                          <p className="font-caption text-secondary text-xs mt-0.5">@{item.username}</p>
                          {item.role && (
                            <p className="font-caption text-secondary/60 text-[10px] uppercase tracking-wider mt-0.5">{item.role}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant rounded-sm max-w-md w-full p-6 relative flex flex-col max-h-[80vh] space-y-4 shadow-xl text-primary">
            <button
              onClick={() => setShowFollowingModal(false)}
              className="absolute top-4 right-4 text-secondary hover:text-primary cursor-pointer z-10"
            >
              <X size={20} />
            </button>
            <h3 className="font-serif font-bold text-xl text-primary">Following</h3>

            <input
              type="text"
              placeholder="Search following..."
              value={followListSearch}
              onChange={(e) => setFollowListSearch(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant px-3 py-2 text-body-md focus:outline-none focus:border-primary text-primary"
            />

            <div className="flex-1 overflow-y-auto space-y-3 min-h-[250px] pr-1">
              {loadingFollowList ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              ) : followingList.filter(item =>
                item.display_name?.toLowerCase().includes(followListSearch.toLowerCase()) ||
                item.username?.toLowerCase().includes(followListSearch.toLowerCase())
              ).length === 0 ? (
                <p className="text-center text-secondary py-12 italic font-body-md">
                  Not following anyone yet.
                </p>
              ) : (
                followingList
                  .filter(item =>
                    item.display_name?.toLowerCase().includes(followListSearch.toLowerCase()) ||
                    item.username?.toLowerCase().includes(followListSearch.toLowerCase())
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setShowFollowingModal(false);
                        router.push(`/profile?id=${item.id}`);
                      }}
                      className="flex items-center justify-between p-2 rounded-sm hover:bg-surface-container-low cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-surface-container">
                          <img
                            alt={item.display_name}
                            className="w-full h-full object-cover"
                            src={item.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.display_name || "U")}&background=1A1A1A&color=fff`}
                          />
                        </div>
                        <div className="text-left">
                          <p className="font-label-md text-primary font-bold leading-none">{item.display_name}</p>
                          <p className="font-caption text-secondary text-xs mt-0.5">@{item.username}</p>
                          {item.role && (
                            <p className="font-caption text-secondary/60 text-[10px] uppercase tracking-wider mt-0.5">{item.role}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          currentUser={user}
          onClose={() => setSelectedPost(null)}
          isLiked={!!likedPosts[selectedPost.id]}
          isBookmarked={!!bookmarkedPosts[selectedPost.id]}
          likeCount={likeCounts[selectedPost.id] || 0}
          onLikeToggle={toggleLike}
          onBookmarkToggle={toggleBookmark}
          onCommentAdded={(postId) => {
            setCommentCounts((prev) => ({
              ...prev,
              [postId]: (prev[postId] || 0) + 1,
            }));
          }}
          onPostDeleted={(postId) => {
            setItems((prev) => prev.filter((item) => item.id !== postId));
            setPostCount((prev) => Math.max(0, prev - 1));
          }}
        />
      )}
    </div>
  );
}

export default function Profile() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
