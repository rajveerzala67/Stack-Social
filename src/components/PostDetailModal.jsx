"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { X, Heart, MessageSquare, Send, Bookmark, Check, Loader2, Copy, Trash2, Music } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const SOUNDTRACKS = [
  { title: "Blinding Lights", artist: "The Weeknd", url: "/songs/Blinding lights.mp3" },
  { title: "Jaiye Sajna", artist: "Sajna Crew", url: "/songs/Jaiye Sajna.mp3" },
  { title: "Majboor", artist: "Majboor Artist", url: "/songs/Majboor.mp3" },
  { title: "Mr Bean Intro Music", artist: "Howard Goodall", url: "/songs/Mr Bean Intro Music .mp3" },
  { title: "Rasputin", artist: "Boney M.", url: "/songs/Rasputin.mp3" },
  { title: "Ennasolla Thangamaga", artist: "Anirudh Ravichander", url: "/songs/ennasolla_thangamaga.mp3" },
  { title: "Kantara Soundtrack", artist: "Ajaneesh Loknath", url: "/songs/kantara.mp3" },
  { title: "Kingdom Samrajya", artist: "Samrajya Crew", url: "/songs/kingdom_samrajya.mp3" }
];

export default function PostDetailModal({
  post,
  currentUser,
  onClose,
  isLiked: initialIsLiked,
  isBookmarked: initialIsBookmarked,
  likeCount: initialLikeCount,
  onLikeToggle,
  onBookmarkToggle,
  onCommentAdded,
  onPostDeleted
}) {
  const commentsEndRef = useRef(null);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Likes & Bookmarks local synced states
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);

  // Share overlay states
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUsers, setShareUsers] = useState([]);
  const [loadingShareUsers, setLoadingShareUsers] = useState(false);
  const [sentStatus, setSentStatus] = useState({}); // { userId: boolean }
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Audio Playback State
  const audioRef = useRef(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);

  const hasSoundtrack = !!post?.soundtrack;
  const audioUrl = hasSoundtrack
    ? SOUNDTRACKS.find(t => post.soundtrack.toLowerCase().includes(t.title.toLowerCase()))?.url
    : null;

  const toggleMusicPlayback = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (isPlayingMusic) {
      audio.pause();
      setIsPlayingMusic(false);
    } else {
      audio.play().catch(err => console.log("Audio play error:", err));
      setIsPlayingMusic(true);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audioUrl) {
      audio.src = audioUrl;
      audio.loop = true;
      
      // Auto play attempt
      audio.play()
        .then(() => setIsPlayingMusic(true))
        .catch(() => setIsPlayingMusic(false));
    } else {
      audio.pause();
      audio.src = "";
      setIsPlayingMusic(false);
    }

    return () => {
      audio.pause();
    };
  }, [audioUrl]);

  // Load comments
  const loadComments = useCallback(async () => {
    if (!post?.id) return;
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*, author:profiles!user_id(display_name, username, avatar_url)")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error("Load comments error:", err);
    } finally {
      setLoadingComments(false);
    }
  }, [post?.id]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Scroll to end of comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  // Handle local like toggle
  const handleLikeClick = async () => {
    setIsLiked(!isLiked);
    setLikeCount((prev) => prev + (isLiked ? -1 : 1));
    if (onLikeToggle) {
      onLikeToggle(post.id);
    }
  };

  // Handle local bookmark toggle
  const handleBookmarkClick = async () => {
    setIsBookmarked(!isBookmarked);
    if (onBookmarkToggle) {
      onBookmarkToggle(post.id);
    }
  };

  // Submit comment
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment || !currentUser) return;
    setSubmittingComment(true);

    const tempText = commentText;
    setCommentText("");

    try {
      const { data: newComment, error } = await supabase
        .from("comments")
        .insert({
          post_id: post.id,
          user_id: currentUser.id,
          content: tempText,
        })
        .select("*, author:profiles!user_id(display_name, username, avatar_url)")
        .single();

      if (error) throw error;

      setComments((prev) => [...prev, newComment]);

      if (onCommentAdded) {
        onCommentAdded(post.id);
      }

      // Send notification client-side to post author
      if (post.author_id !== currentUser.id) {
        await supabase.from("notifications").insert({
          recipient_id: post.author_id,
          actor_id: currentUser.id,
          type: "comment",
          message: "commented on your post.",
          post_id: post.id,
        });
      }
    } catch (err) {
      console.error("Comment submit error:", err);
      setCommentText(tempText); // restore on error
      alert("Failed to submit comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  // Fetch share destinations (curators)
  const openSharePanel = async () => {
    setShowShareModal(true);
    if (shareUsers.length > 0) return;
    setLoadingShareUsers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .neq("id", currentUser?.id || "")
        .limit(12);

      if (error) throw error;
      setShareUsers(data || []);
    } catch (err) {
      console.error("Load share users error:", err);
    } finally {
      setLoadingShareUsers(false);
    }
  };

  // Share post as direct message
  const handleShareToUser = async (recipient) => {
    if (!currentUser) return;
    setSentStatus((prev) => ({ ...prev, [recipient.id]: "sending" }));

    try {
      // 1. Check if direct conversation exists
      const { data: myConvs } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", currentUser.id);

      const { data: theirConvs } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", recipient.id);

      const common = myConvs?.find((mc) =>
        theirConvs?.some((tc) => tc.conversation_id === mc.conversation_id)
      );

      let convId;
      if (common) {
        convId = common.conversation_id;
      } else {
        // Create conversation
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({ type: "direct" })
          .select()
          .single();

        if (convError) throw convError;
        convId = newConv.id;

        // Add members
        await supabase.from("conversation_members").insert([
          { conversation_id: convId, user_id: currentUser.id },
          { conversation_id: convId, user_id: recipient.id },
        ]);
      }

      // 2. Send share link as a message
      const postUrl = `${window.location.origin}/?post=${post.id}`;
      const { error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: convId,
          sender_id: currentUser.id,
          type: "text",
          content: `Shared a post: ${postUrl}`,
        });

      if (msgError) throw msgError;

      // 3. Update conversation last updated timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);

      setSentStatus((prev) => ({ ...prev, [recipient.id]: "sent" }));
    } catch (err) {
      console.error("Direct share error:", err);
      setSentStatus((prev) => ({ ...prev, [recipient.id]: "error" }));
    }
  };

  // Copy share link
  const handleCopyLink = () => {
    const postUrl = `${window.location.origin}/?post=${post.id}`;
    navigator.clipboard.writeText(postUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDeleteClick = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this curation?")) {
      return;
    }
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id);

      if (error) throw error;

      if (onPostDeleted) {
        onPostDeleted(post.id);
      }
      onClose();
    } catch (err) {
      console.error("Error deleting post:", err);
      alert("Failed to delete post.");
    } finally {
      setIsDeleting(false);
    }
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-0 md:p-4">
      {/* Lightbox Container */}
      <div className="bg-surface border border-outline-variant w-full h-full md:h-[85vh] md:max-w-4xl rounded-none md:rounded-lg overflow-hidden flex flex-col md:flex-row shadow-2xl relative">
        
        {/* Left Side: Media Lightbox */}
        <div className="w-full md:w-1/2 h-[45vh] md:h-full bg-black relative flex items-center justify-center border-b md:border-b-0 md:border-r border-outline-variant/30 shrink-0">
          <audio ref={audioRef} className="hidden" />
          {post.media_type === "video" ? (
            <video src={post.media_urls?.[0]} controls className="w-full h-full object-contain" autoPlay loop playsInline muted={hasSoundtrack && isPlayingMusic} />
          ) : (
            <img src={post.media_urls?.[0]} className="w-full h-full object-contain" alt="Post media" />
          )}
          {hasSoundtrack && audioUrl && (
            <button
              onClick={toggleMusicPlayback}
              className="absolute top-4 left-4 z-20 backdrop-blur-md bg-black/60 hover:bg-black/80 border border-white/20 text-white px-3 py-1.5 rounded-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
            >
              <Music className={`w-3.5 h-3.5 ${isPlayingMusic ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }} />
              <span>{isPlayingMusic ? "Stop Music" : "Play Music"}</span>
            </button>
          )}
        </div>

        {/* Right Side: Comments and Interactions */}
        <div className="flex-1 h-0 min-h-0 md:h-full flex flex-col justify-between bg-surface-container-lowest">
          
          {/* Header (Author) */}
          <header className="h-16 flex items-center justify-between px-4 border-b border-outline-variant/30 shrink-0 bg-surface">
            <div className="flex items-center gap-3">
              <img src={post.author?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.display_name || "U")}&background=1A1A1A&color=fff`}
                className="w-9 h-9 rounded-full object-cover border border-outline-variant/20" alt="" />
              <div className="text-left">
                <span className="font-label-md text-xs text-primary block leading-none">{post.author?.display_name}</span>
                <span className="font-caption text-[10px] text-secondary mt-1 block">@{post.author?.username}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentUser && post.author_id === currentUser.id && (
                <button
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors cursor-pointer text-secondary flex items-center justify-center"
                  title="Delete curation"
                >
                  {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                </button>
              )}
              <button onClick={onClose} className="p-1.5 hover:bg-surface-container-high rounded-full transition-colors cursor-pointer text-primary">
                <X size={20} />
              </button>
            </div>
          </header>

          {/* Scrollable Feed (Caption + Comments) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-brand-ivory/30">
            {/* Caption */}
            {post.caption && (
              <div className="flex gap-3 items-start pb-4 border-b border-outline-variant/20">
                <img src={post.author?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.display_name || "U")}&background=1A1A1A&color=fff`}
                  className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
                <div className="text-left">
                  <p className="text-xs text-primary leading-normal break-words whitespace-pre-wrap">
                    <span className="font-bold mr-1.5">{post.author?.display_name}</span>
                    {post.caption}
                  </p>
                  <span className="text-[9px] text-secondary/60 mt-1.5 block">{timeAgo(post.created_at)}</span>
                </div>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-4">
              {loadingComments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-secondary" size={20} />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-xs text-secondary/60 italic py-12">No comments yet. Start the conversation!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 items-start animate-fade-in">
                    <img src={comment.author?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author?.display_name || "U")}&background=1A1A1A&color=fff`}
                      className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-xs text-primary leading-normal break-words whitespace-pre-wrap">
                        <span className="font-bold mr-1.5">{comment.author?.display_name}</span>
                        {comment.content}
                      </p>
                      <span className="text-[9px] text-secondary/60 mt-1.5 block">{timeAgo(comment.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>
          </div>

          {/* Interaction Action Bar */}
          <div className="px-4 py-3 border-t border-outline-variant/30 bg-surface shrink-0">
            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                {/* Like */}
                <button onClick={handleLikeClick}
                  className="flex items-center gap-1.5 font-label-md text-xs text-primary hover:opacity-70 transition-opacity cursor-pointer">
                  <Heart className={isLiked ? "fill-current text-red-500" : ""} size={18} />
                  <span>{likeCount}</span>
                </button>
                {/* Comments Count */}
                <div className="flex items-center gap-1.5 font-label-md text-xs text-primary">
                  <MessageSquare size={18} />
                  <span>{comments.length}</span>
                </div>
                {/* Share */}
                <button onClick={openSharePanel}
                  className="flex items-center gap-1.5 font-label-md text-xs text-primary hover:opacity-70 transition-opacity cursor-pointer"
                  title="Share post">
                  <Send size={18} />
                </button>
              </div>
              
              {/* Bookmark */}
              <button onClick={handleBookmarkClick}
                className="text-secondary hover:text-primary transition-colors cursor-pointer"
                title="Bookmark post">
                <Bookmark className={isBookmarked ? "fill-current text-primary" : ""} size={18} />
              </button>
            </div>
          </div>

          {/* Comment Form Input */}
          <form onSubmit={handleCommentSubmit} className="p-3 border-t border-outline-variant/20 bg-background flex gap-2 shrink-0">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-surface-container-low border border-outline-variant px-4 py-2 rounded-xl text-xs focus:outline-none focus:border-primary text-primary"
              disabled={submittingComment}
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submittingComment}
              className="bg-primary text-on-primary font-bold px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest cursor-pointer disabled:opacity-30 hover:opacity-90 active:scale-95 transition-all shrink-0"
            >
              {submittingComment ? <Loader2 className="animate-spin" size={12} /> : "Post"}
            </button>
          </form>
        </div>

        {/* Share Modal Dialog Overlay */}
        {showShareModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-surface border border-outline-variant max-w-sm w-full p-5 rounded-sm relative space-y-4 shadow-xl">
              <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 text-secondary hover:text-primary cursor-pointer">
                <X size={18} />
              </button>
              
              <div className="text-center">
                <h4 className="font-serif font-bold text-lg text-primary uppercase">Share Post</h4>
                <p className="text-[11px] text-secondary mt-0.5">Send this curated post to your curators</p>
              </div>

              {/* Copy Link Row */}
              <button onClick={handleCopyLink}
                className="w-full flex items-center justify-between p-3 border border-outline-variant/30 rounded-lg hover:border-primary transition-all text-xs text-primary bg-surface-container-low cursor-pointer">
                <div className="flex items-center gap-2">
                  {copiedLink ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-secondary" />}
                  <span>{copiedLink ? "Link Copied!" : "Copy Post Link"}</span>
                </div>
                {!copiedLink && <span className="text-[9px] uppercase text-secondary font-bold tracking-wider">Copy</span>}
              </button>

              <div className="border-t border-outline-variant/20 pt-3">
                <span className="text-[9px] uppercase tracking-widest font-bold text-secondary mb-2 block">Direct Message</span>
                
                <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar">
                  {loadingShareUsers ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="animate-spin text-secondary" size={16} />
                    </div>
                  ) : shareUsers.length === 0 ? (
                    <p className="text-center text-xs text-secondary/60 italic py-4">No curators available</p>
                  ) : (
                    shareUsers.map((user) => {
                      const status = sentStatus[user.id];
                      return (
                        <div key={user.id} className="flex items-center justify-between p-2 hover:bg-surface-container-low rounded-lg transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || "U")}&background=1A1A1A&color=fff`}
                              className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
                            <div className="text-left min-w-0">
                              <p className="font-bold text-xs text-primary truncate leading-tight">{user.display_name}</p>
                              <p className="font-caption text-[10px] text-secondary truncate">@{user.username}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleShareToUser(user)}
                            disabled={status === "sending" || status === "sent"}
                            className={`px-3 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                              status === "sent"
                                ? "bg-green-600 text-white cursor-default"
                                : status === "sending"
                                ? "bg-surface-container-high text-secondary"
                                : "bg-primary text-on-primary hover:opacity-90 active:scale-95"
                            }`}
                          >
                            {status === "sending" ? (
                              <Loader2 className="animate-spin" size={10} />
                            ) : status === "sent" ? (
                              "Sent"
                            ) : (
                              "Send"
                            )}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
