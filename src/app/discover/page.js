"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { Search, Loader2, ArrowRight, Grid, Bookmark, Heart, MessageSquare } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import PostDetailModal from "@/components/PostDetailModal";

const CATEGORIES = ["Architecture", "Fashion", "Photography", "Lifestyle", "Design", "Still Life"];

export default function Discover() {
  const pageRef = useRef(null);
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("All");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState([]);
  const [followingMap, setFollowingMap] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  // Preference-based onboarding
  const [showPrefModal, setShowPrefModal] = useState(false);
  const [userPrefs, setUserPrefs] = useState([]);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Post detail modal & synced interactions
  const [selectedPost, setSelectedPost] = useState(null);
  const [likedPosts, setLikedPosts] = useState({});
  const [bookmarkedPosts, setBookmarkedPosts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [commentCounts, setCommentCounts] = useState({});

  // Fetch popular creators
  const fetchCreators = useCallback(async () => {
    try {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, role")
        .neq("id", user?.id || "")
        .limit(4);

      if (profilesData) {
        setCreators(profilesData);
      }

      if (user) {
        const { data: followsData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        const fMap = {};
        (followsData || []).forEach((f) => {
          fMap[f.following_id] = true;
        });
        setFollowingMap(fMap);
      }
    } catch (err) {
      console.error("Creators fetch error:", err);
    }
  }, [user]);

  // Fetch posts by category / search / preferences
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Build Base Query first
      let postsQuery = supabase
        .from("posts")
        .select("*, author:profiles!author_id(id, display_name, username, avatar_url, is_private)")
        .eq("is_archived", false);

      // Search Query
      if (searchQuery.trim()) {
        postsQuery = postsQuery.ilike("caption", `%${searchQuery}%`);
      }

      // Category Tab filter
      if (activeTab !== "All") {
        postsQuery = postsQuery.eq("category", activeTab);
      }

      // 2. Parallelize Step 1 queries (preferences, posts, follows, blocks)
      const [
        prefsRes,
        postsRes,
        followsRes,
        blocksRes
      ] = await Promise.all([
        user ? supabase.from("user_preferences").select("category").eq("user_id", user.id) : Promise.resolve({ data: [] }),
        postsQuery.order("created_at", { ascending: false }).limit(60),
        user ? supabase.from("follows").select("following_id").eq("follower_id", user.id) : Promise.resolve({ data: [] }),
        user ? supabase.from("blocks").select("blocker_id, blocked_id").or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`) : Promise.resolve({ data: [] })
      ]);

      if (postsRes.error) throw postsRes.error;
      const postsData = postsRes.data || [];
      const prefs = prefsRes.data || [];
      const userFollows = followsRes.data || [];
      const userBlocks = blocksRes.data || [];

      const preferredCats = prefs.map((p) => p.category);
      setUserPrefs(preferredCats);

      // If user has zero preferences set, trigger onboarding modal
      if (user && preferredCats.length === 0 && activeTab === "All") {
        setShowPrefModal(true);
      }

      const followedSet = new Set(userFollows.map((f) => f.following_id));
      const blockedSet = new Set();
      userBlocks.forEach((b) => {
        blockedSet.add(b.blocker_id);
        blockedSet.add(b.blocked_id);
      });

      // Filter based on privacy & block settings
      const filteredPosts = postsData.filter((post) => {
        const author = post.author;
        if (!author) return false;
        if (user && author.id === user.id) return true;
        if (blockedSet.has(author.id)) return false;
        if (author.is_private) {
          return followedSet.has(author.id);
        }
        return true;
      });

      // 3. Parallelize Step 2 queries (likes, bookmarks, counts) for the filtered posts
      if (filteredPosts.length > 0) {
        const postIds = filteredPosts.map((p) => p.id);

        const [
          userLikesRes,
          userBookmarksRes,
          likesDataRes,
          commentsDataRes
        ] = await Promise.all([
          user ? supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds) : Promise.resolve({ data: [] }),
          user ? supabase.from("bookmarks").select("post_id").eq("user_id", user.id).in("post_id", postIds) : Promise.resolve({ data: [] }),
          supabase.from("likes").select("post_id").in("post_id", postIds),
          supabase.from("comments").select("post_id").in("post_id", postIds)
        ]);

        const userLikes = userLikesRes.data || [];
        const userBookmarks = userBookmarksRes.data || [];
        const likesData = likesDataRes.data || [];
        const commentsData = commentsDataRes.data || [];

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

      // Rank preferred categories first if tab is "All"
      let processedPosts = filteredPosts || [];
      if (activeTab === "All" && preferredCats.length > 0) {
        const preferredSet = new Set(preferredCats);
        processedPosts = [...processedPosts].sort((a, b) => {
          const aPref = preferredSet.has(a.category) ? 1 : 0;
          const bPref = preferredSet.has(b.category) ? 1 : 0;
          return bPref - aPref; // Preferred categories first
        });
      }

      setPosts(processedPosts);
    } catch (err) {
      console.error("Discover posts error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, activeTab, searchQuery]);

  useEffect(() => {
    fetchCreators();
  }, [fetchCreators]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Animate masonry cards
  useEffect(() => {
    if (loading || posts.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".masonry-card",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, stagger: 0.05, duration: 0.7, ease: "power3.out" }
      );
    }, pageRef);
    return () => ctx.revert();
  }, [loading, posts]);

  // Save onboarding preferences
  const handleSavePrefs = async (selected) => {
    if (!user) return;
    setSavingPrefs(true);
    try {
      // Clear existing first
      await supabase.from("user_preferences").delete().eq("user_id", user.id);

      // Insert new preferences
      const rows = selected.map((cat) => ({
        user_id: user.id,
        category: cat,
        weight: 1.0,
      }));

      if (rows.length > 0) {
        const { error } = await supabase.from("user_preferences").insert(rows);
        if (error) throw error;
      }

      setUserPrefs(selected);
      setShowPrefModal(false);
      fetchPosts(); // Reload feed with recommendations
    } catch (err) {
      console.error("Save preferences error:", err);
      alert("Failed to save preferences.");
    } finally {
      setSavingPrefs(false);
    }
  };

  // Toggle follow on creators
  const toggleFollow = async (creatorId) => {
    if (!user) return;
    const isFollowing = followingMap[creatorId];

    setFollowingMap((prev) => ({ ...prev, [creatorId]: !isFollowing }));

    try {
      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", creatorId);
      } else {
        await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: creatorId, status: "accepted" });

        await supabase.from("notifications").insert({
          recipient_id: creatorId,
          actor_id: user.id,
          type: "follow",
          message: "started following you.",
        });
      }
    } catch (err) {
      console.error("Toggle follow error:", err);
      setFollowingMap((prev) => ({ ...prev, [creatorId]: isFollowing }));
    }
  };

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
    } catch {
      setBookmarkedPosts((prev) => ({ ...prev, [postId]: isBookmarked }));
    }
  };

  return (
    <div ref={pageRef} className="pt-24 pb-stack-lg px-margin-mobile md:px-margin-desktop max-w-screen-xl mx-auto">
      {/* Hero Header */}
      <section className="mb-stack-lg animate-fade-in flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="font-display-lg text-display-lg text-primary mb-2">
            Discover the Extraordinary
          </h2>
          <p className="font-body-lg text-body-lg text-secondary max-w-xl">
            A curated stream of visual narratives, global fashion archives, and contemporary art movements, selected for the discerning eye.
          </p>
        </div>

        {/* Live Search */}
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant py-2.5 pl-10 pr-4 text-body-md font-body-md focus:outline-none focus:border-primary transition-colors text-primary rounded-sm"
            placeholder="Search discover..."
          />
        </div>
      </section>

      {/* Tabs */}
      <section className="mb-stack-md border-b border-outline-variant/20 pb-2">
        <div className="flex gap-6 overflow-x-auto no-scrollbar py-2">
          {["All", ...CATEGORIES].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`font-label-md text-label-md transition-colors relative pb-1 whitespace-nowrap cursor-pointer uppercase tracking-widest ${
                activeTab === tab
                  ? "text-primary font-bold border-b-2 border-primary"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {/* Masonry / Grid of Curated Posts */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-stack-lg animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <article key={i} className="bg-surface border border-outline-variant overflow-hidden rounded-sm">
              <div className="aspect-[4/5] w-full bg-surface-container animate-shimmer" />
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-surface-container animate-shimmer shrink-0" />
                  <div className="flex flex-col gap-2 w-full">
                    <div className="w-20 h-2.5 rounded bg-surface-container animate-shimmer" />
                    <div className="w-16 h-2 rounded bg-surface-container-low animate-shimmer" />
                  </div>
                </div>
                <div className="w-full h-3 rounded bg-surface-container animate-shimmer" />
                <div className="w-2/3 h-2.5 rounded bg-surface-container-low animate-shimmer" />
              </div>
            </article>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-secondary italic font-body-md">
          No posts found in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-stack-lg">
          {posts.map((post) => (
            <article key={post.id}
              onClick={() => setSelectedPost(post)}
              className="masonry-card bg-surface border border-outline-variant overflow-hidden rounded-sm group shadow-[0px_10px_30px_rgba(0,0,0,0.01)] hover:shadow-md transition-shadow cursor-pointer">
              {/* Media */}
              <div className="aspect-[4/5] relative w-full overflow-hidden bg-surface-container border-b border-outline-variant/30">
                {post.media_type === "video" ? (
                  <video src={post.media_urls?.[0]} className="w-full h-full object-cover" controls muted />
                ) : (
                  <img alt={post.caption} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-103" src={post.media_urls?.[0]} />
                )}
                {post.category && (
                  <span className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-full">
                    {post.category}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <img src={post.author?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.display_name || "U")}&background=1A1A1A&color=fff`}
                    className="w-6 h-6 rounded-full object-cover" alt="" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-primary truncate">{post.author?.display_name}</span>
                    <span className="text-[10px] text-secondary truncate">@{post.author?.username}</span>
                  </div>
                </div>
                <p className="text-xs text-primary line-clamp-2 leading-relaxed">{post.caption}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Popular Creators */}
      {creators.length > 0 && (
        <section className="border-t border-outline-variant pt-stack-md mt-12">
          <div className="flex justify-between items-end mb-stack-sm">
            <h3 className="font-label-md text-label-md uppercase tracking-widest text-primary">
              Popular Creators
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {creators.map((c) => (
              <div
                key={c.id}
                onClick={() => router.push(`/profile?id=${c.id}`)}
                className="flex flex-col items-center text-center p-6 bg-surface-container-low border border-outline-variant/30 hover:border-outline-variant transition-colors rounded-lg cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden mb-3 border border-outline-variant shrink-0 transition-transform duration-500 group-hover:scale-105">
                  <img
                    alt={c.display_name}
                    className="w-full h-full object-cover"
                    src={c.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.display_name || "U")}&background=1A1A1A&color=fff`}
                  />
                </div>
                <div className="min-w-0 mb-4 w-full">
                  <p className="font-body-md font-semibold text-primary truncate">{c.display_name}</p>
                  <p className="font-caption text-secondary truncate mt-0.5">{c.role || "Visual Artist"}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); toggleFollow(c.id); }}
                  className="w-full py-2 border border-primary text-primary text-label-md font-bold uppercase tracking-widest hover:bg-primary hover:text-on-primary active:scale-95 transition-all cursor-pointer relative z-10">
                  {followingMap[c.id] ? "Following" : "Follow"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Preferences Onboarding Modal */}
      {showPrefModal && (
        <PreferenceModal
          onSave={handleSavePrefs}
          onClose={() => setShowPrefModal(false)}
          saving={savingPrefs}
        />
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
            setPosts((prev) => prev.filter((item) => item.id !== postId));
          }}
        />
      )}
    </div>
  );
}

// Preference Selection Modal Component
function PreferenceModal({ onSave, onClose, saving }) {
  const [selected, setSelected] = useState([]);

  const toggleSelect = (cat) => {
    if (selected.includes(cat)) {
      setSelected(selected.filter((c) => c !== cat));
    } else {
      setSelected([...selected, cat]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selected.length === 0) {
      alert("Please select at least one preference.");
      return;
    }
    onSave(selected);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <div className="bg-surface border border-outline-variant max-w-md w-full p-8 rounded-sm relative space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <span className="font-caption text-caption text-secondary uppercase tracking-[0.2em]">Personalize Feed</span>
          <h3 className="font-serif font-black text-2xl text-primary uppercase tracking-tighter">Your Preferences</h3>
          <p className="font-body-md text-secondary">
            Select the categories that inspire you the most. We will tailor your feed to highlight posts from these topics.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => {
              const isSelected = selected.includes(cat);
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => toggleSelect(cat)}
                  className={`py-3 px-4 text-center rounded-md font-label-md text-xs uppercase tracking-widest border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary border-primary text-on-primary font-bold shadow-md"
                      : "bg-surface-container-low border-outline-variant text-secondary hover:border-primary hover:text-primary"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="flex gap- stack-sm">
            <button
              type="submit"
              disabled={saving || selected.length === 0}
              className="w-full bg-primary text-on-primary font-label-md text-label-md py-3 rounded-full hover:opacity-90 active:scale-95 transition-all uppercase tracking-widest font-bold disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : "Tailor My Feed"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
