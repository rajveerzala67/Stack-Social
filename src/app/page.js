"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import gsap from "gsap";
import Link from "next/link";
import { MoreHorizontal, Heart, MessageSquare, Send, Bookmark, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import StoryViewer from "@/components/StoryViewer";
import PostDetailModal from "@/components/PostDetailModal";
import { useSearchParams } from "next/navigation";

function StoriesSkeleton() {
  return (
    <section className="mb-stack-lg border-b border-outline-variant/30 pb-6">
      <div className="flex gap-stack-sm overflow-x-auto no-scrollbar py-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className="w-16 h-16 rounded-full p-[2px] border border-outline-variant/50">
              <div className="w-full h-full rounded-full animate-shimmer" />
            </div>
            <div className="w-12 h-2 rounded bg-surface-container animate-shimmer" />
          </div>
        ))}
      </div>
    </section>
  );
}

function PostsSkeleton() {
  return (
    <div className="space-y-stack-lg">
      {[1, 2].map((i) => (
        <article key={i} className="magazine-post bg-surface border border-outline-variant overflow-hidden rounded-sm">
          {/* Header */}
          <div className="p-stack-md border-b border-outline-variant flex items-center gap-4">
            <div className="w-8 h-8 rounded-full animate-shimmer shrink-0" />
            <div className="flex flex-col gap-2 w-full">
              <div className="w-24 h-3 rounded bg-surface-container animate-shimmer" />
              <div className="w-16 h-2 rounded bg-surface-container-low animate-shimmer" />
            </div>
          </div>
          {/* Media */}
          <div className="aspect-[4/5] w-full animate-shimmer" />
          {/* Content */}
          <div className="p-stack-md space-y-3">
            <div className="w-3/4 h-3 rounded bg-surface-container animate-shimmer" />
            <div className="w-1/2 h-2.5 rounded bg-surface-container-low animate-shimmer" />
            <div className="pt-stack-sm flex justify-between items-center border-t border-outline-variant/30">
              <div className="flex gap-6">
                <div className="w-10 h-3 rounded bg-surface-container animate-shimmer" />
                <div className="w-10 h-3 rounded bg-surface-container animate-shimmer" />
              </div>
              <div className="w-6 h-6 rounded bg-surface-container animate-shimmer" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function HomeFeedContent() {
  const containerRef = useRef(null);
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const deepLinkPostId = searchParams.get("post");

  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState({});
  const [bookmarkedPosts, setBookmarkedPosts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  // Fetch posts from DB
  const fetchPosts = useCallback(async () => {
    if (!user) return;
    try {
      // Parallelize all primary independent database queries
      const [
        postsResult,
        followsResult,
        blocksResult,
        likesResult,
        bookmarksResult,
        storiesResult
      ] = await Promise.all([
        supabase
          .from("posts")
          .select("*, author:profiles!author_id(id, display_name, username, avatar_url, role, is_private)")
          .eq("type", "post")
          .eq("is_archived", false)
          .order("created_at", { ascending: false })
          .limit(40),
        supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id),
        supabase
          .from("blocks")
          .select("blocker_id, blocked_id")
          .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
        supabase
          .from("likes")
          .select("post_id")
          .eq("user_id", user.id),
        supabase
          .from("bookmarks")
          .select("post_id")
          .eq("user_id", user.id),
        supabase
          .from("posts")
          .select("*, author:profiles!author_id(id, display_name, username, avatar_url, is_private)")
          .eq("type", "story")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(30)
      ]);

      if (postsResult.error) throw postsResult.error;
      const postsData = postsResult.data || [];
      const userFollows = followsResult.data || [];
      const userBlocks = blocksResult.data || [];
      const userLikes = likesResult.data || [];
      const userBookmarks = bookmarksResult.data || [];
      const storiesData = storiesResult.data || [];

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
        if (author.id === user.id) return true; // always show own posts
        if (blockedSet.has(author.id)) return false; // hide blocked users' posts
        if (author.is_private) {
          return followedSet.has(author.id); // show private posts only if followed
        }
        return true; // show public posts
      });

      const likedMap = {};
      userLikes.forEach((l) => (likedMap[l.post_id] = true));
      setLikedPosts(likedMap);

      const bookmarkedMap = {};
      userBookmarks.forEach((b) => (bookmarkedMap[b.post_id] = true));
      setBookmarkedPosts(bookmarkedMap);

      // Fetch like and comment counts for filtered posts in parallel
      const postIds = filteredPosts.map((p) => p.id);
      if (postIds.length > 0) {
        const [likesRes, commentsRes] = await Promise.all([
          supabase.from("likes").select("post_id").in("post_id", postIds),
          supabase.from("comments").select("post_id").in("post_id", postIds)
        ]);

        const counts = {};
        (likesRes.data || []).forEach((l) => {
          counts[l.post_id] = (counts[l.post_id] || 0) + 1;
        });
        setLikeCounts(counts);

        const cCounts = {};
        (commentsRes.data || []).forEach((c) => {
          cCounts[c.post_id] = (cCounts[c.post_id] || 0) + 1;
        });
        setCommentCounts(cCounts);
      }

      setPosts(filteredPosts.slice(0, 20));

      const filteredStories = storiesData.filter((story) => {
        const author = story.author;
        if (!author) return false;
        if (author.id === user.id) return true;
        if (blockedSet.has(author.id)) return false;
        if (author.is_private) {
          return followedSet.has(author.id);
        }
        return true;
      });

      // Group stories by author to keep them contiguous (like Instagram)
      const storiesByAuthor = {};
      filteredStories.forEach((story) => {
        if (!storiesByAuthor[story.author_id]) {
          storiesByAuthor[story.author_id] = [];
        }
        storiesByAuthor[story.author_id].push(story);
      });
      const groupedStories = Object.values(storiesByAuthor).flat();
      setStories(groupedStories);
    } catch (err) {
      console.error("Feed fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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
          setSelectedPost(data);
        }
      } catch (err) {
        console.error("Error loading deep link post:", err);
      }
    }

    loadDeepLinkPost();
  }, [deepLinkPostId, user]);

  // Animate on load
  useEffect(() => {
    if (loading || posts.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.from(".story-circle", { scale: 0.8, opacity: 0, y: 10, stagger: 0.08, duration: 0.6, ease: "back.out(1.7)" });
      gsap.from(".magazine-post", { y: 40, opacity: 0, stagger: 0.15, duration: 0.8, ease: "power3.out", delay: 0.2 });
    }, containerRef);
    return () => ctx.revert();
  }, [loading, posts]);

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

  // Share (copy link)
  const handleShare = (postId) => {
    navigator.clipboard.writeText(`${window.location.origin}/?post=${postId}`);
  };

  const formatCount = (n) => {
    if (!n || n === 0) return "0";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}M AGO`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}H AGO`;
    const days = Math.floor(hrs / 24);
    return `${days}D AGO`;
  };

  return (
    <div ref={containerRef} className="pt-8 pb-stack-lg px-margin-mobile md:px-gutter max-w-screen-md mx-auto">
      {/* Stories Carousel */}
      {loading ? (
        <StoriesSkeleton />
      ) : stories.length > 0 && (() => {
        const uniqueAuthorIndices = [];
        const seenAuthors = new Set();
        stories.forEach((story, idx) => {
          if (!seenAuthors.has(story.author_id)) {
            seenAuthors.add(story.author_id);
            uniqueAuthorIndices.push(idx);
          }
        });

        return (
          <section className="mb-stack-lg border-b border-outline-variant/30 pb-6">
            <div className="flex gap-stack-sm overflow-x-auto no-scrollbar py-2">
              {uniqueAuthorIndices.map((idx) => {
                const story = stories[idx];
                return (
                  <div key={story.id} 
                    onClick={() => setSelectedStoryIndex(idx)}
                    className="story-circle flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group animate-fade-in">
                    <div className="w-16 h-16 rounded-full p-[2px] border border-primary group-hover:border-primary transition-all duration-300">
                      <div className="w-full h-full rounded-full overflow-hidden">
                        <img alt={story.author?.display_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          src={story.author?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(story.author?.display_name || "U")}&background=1A1A1A&color=fff`} />
                      </div>
                    </div>
                    <span className="font-caption text-[10px] uppercase tracking-tighter text-on-surface">
                      {story.author?.display_name?.split(" ")[0] || "User"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* Posts Feed */}
      {loading ? (
        <PostsSkeleton />
      ) : posts.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <p className="font-display-md text-primary">Your feed is empty</p>
          <p className="font-body-md text-secondary">Follow creators or create your first post to get started.</p>
          <Link href="/create" className="inline-block px-8 py-3 bg-primary text-on-primary font-label-md uppercase tracking-widest hover:opacity-90 transition-all">
            Create First Post
          </Link>
        </div>
      ) : (
        <div className="space-y-stack-lg">
          {posts.map((post) => (
            <article key={post.id} className="magazine-post bg-surface border border-outline-variant overflow-hidden rounded-sm transition-shadow duration-300 hover:shadow-md">
              {/* Author Header */}
              <div className="p-stack-md border-b border-outline-variant flex items-center gap-4">
                <Link href={`/profile?id=${post.author?.id}`} className="flex items-center gap-3 hover:opacity-75 transition-opacity cursor-pointer">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container shrink-0">
                    <img className="w-full h-full object-cover"
                      src={post.author?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.display_name || "U")}&background=1A1A1A&color=fff`}
                      alt={post.author?.display_name} />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-label-md text-label-md text-primary leading-none">{post.author?.display_name}</span>
                    <span className="font-caption text-caption text-secondary mt-1">@{post.author?.username}</span>
                  </div>
                </Link>
                <div className="ml-auto">
                  <MoreHorizontal className="text-secondary cursor-pointer hover:text-primary transition-colors" size={20} />
                </div>
              </div>

              {/* Media */}
              {post.media_urls?.[0] && (
                <div className="aspect-[4/5] relative w-full overflow-hidden cursor-pointer bg-surface-container"
                  onClick={() => setSelectedPost(post)}
                  onDoubleClick={() => toggleLike(post.id)}>
                  {post.media_type === "video" ? (
                    <video src={post.media_urls[0]} className="w-full h-full object-cover" controls />
                  ) : (
                    <img alt={post.caption || "Post"} className="w-full h-full object-cover" src={post.media_urls[0]} />
                  )}
                </div>
              )}

              {/* Content */}
              <div className="p-stack-md space-y-3">
                {post.caption && (
                  <p className="font-body-md text-body-md text-primary leading-relaxed">{post.caption}</p>
                )}

                {/* Action Bar */}
                <div className="pt-stack-sm flex justify-between items-center border-t border-outline-variant/30">
                  <div className="flex gap-6">
                    <button onClick={() => toggleLike(post.id)}
                      className="flex items-center gap-2 font-label-md text-label-md text-primary hover:opacity-70 transition-opacity cursor-pointer">
                      <Heart className={likedPosts[post.id] ? "fill-current text-red-500" : ""} size={20} />
                      <span>{formatCount(likeCounts[post.id] || 0)}</span>
                    </button>
                    <button onClick={() => setSelectedPost(post)}
                      className="flex items-center gap-2 font-label-md text-label-md text-primary hover:opacity-70 transition-opacity cursor-pointer">
                      <MessageSquare size={20} />
                      <span>{formatCount(commentCounts[post.id] || 0)}</span>
                    </button>
                    <button onClick={() => handleShare(post.id)}
                      className="flex items-center gap-2 font-label-md text-label-md text-primary hover:opacity-70 transition-opacity cursor-pointer"
                      title="Share link copied">
                      <Send size={20} />
                    </button>
                  </div>
                  <button onClick={() => toggleBookmark(post.id)}
                    className="text-secondary hover:text-primary transition-colors cursor-pointer">
                    <Bookmark className={bookmarkedPosts[post.id] ? "fill-current text-primary" : ""} size={20} />
                  </button>
                </div>

                <span className="font-caption text-caption text-secondary">{timeAgo(post.created_at)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
      {selectedStoryIndex !== null && (
        <StoryViewer
          stories={stories}
          initialIndex={selectedStoryIndex}
          onClose={() => setSelectedStoryIndex(null)}
          onStoryDeleted={(deletedId) => {
            setStories((prev) => prev.filter((s) => s.id !== deletedId));
          }}
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

export default function HomeFeed() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <HomeFeedContent />
    </Suspense>
  );
}
