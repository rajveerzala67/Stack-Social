"use client";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

import { useEffect, useState, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Music, Play, Pause, Trash2 } from "lucide-react";
import gsap from "gsap";

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

export default function StoryViewer({ stories, initialIndex = 0, onClose, onStoryDeleted }) {
  // Supabase client for deletions (adjust import path if needed)
  // Supabase instance imported above
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const progressIntervalRef = useRef(null);

  const activeStory = stories[currentIndex];
  const hasSoundtrack = !!activeStory?.soundtrack;
  const audioUrl = hasSoundtrack && activeStory?.soundtrack
    ? SOUNDTRACKS.find(t => activeStory.soundtrack.toLowerCase().includes(t.title.toLowerCase()))?.url
    : null;

  const videoMuted = hasSoundtrack ? true : isMuted;

  // GSAP Entrance
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.35, ease: "power2.out" }
      );
    }
  }, []);

  // Handle background soundtrack play/pause/mute
  useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      if (audioUrl) {
        if (audio.src !== audioUrl) {
          audio.src = audioUrl;
        }
        audio.muted = isMuted;
        if (isPlaying && !isMuted) {
          audio.play().catch((err) => console.log("Audio play blocked by browser:", err));
        } else {
          audio.pause();
        }
      } else {
        audio.pause();
        audio.src = "";
      }

      return () => {
        audio.pause();
      };
    }, [audioUrl, isMuted, isPlaying]);

  // Synchronize video muted state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = videoMuted;
    }
  }, [videoMuted]);

  // Handle auto-advancing / progress bar tracking
  useEffect(() => {
    if (!activeStory) return;

    // Reset progress
    setProgress(0);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    const duration = 10000; // Fixed 10 seconds for all stories
    const step = 100; // Update every 100ms
    let elapsed = 0;

    progressIntervalRef.current = setInterval(() => {
      elapsed += step;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(progressIntervalRef.current);
        handleNext();
      }
    }, step);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentIndex, activeStory]);

  // Navigate next
  const deleteCurrentStory = async () => {
    if (!supabase) {
      console.error('Supabase client not available');
      return;
    }
    if (!activeStory?.id) {
      console.error('No story id to delete', activeStory);
      return;
    }
    if (!window.confirm("Are you sure you want to delete this story?")) {
      return;
    }
    console.log('Deleting story with id', activeStory.id);
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', activeStory.id)
      .eq('type', 'story');
    if (error) {
      console.error('Failed to delete story. Full error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      alert(`Failed to delete story: ${error.message || 'Unknown error'}`);
      return;
    }
    
    // Call the parent callback to update its local state
    if (onStoryDeleted) {
      onStoryDeleted(activeStory.id);
    }

    // After deletion, move to next story or close viewer
    if (stories.length <= 1) {
      handleClose();
    } else if (currentIndex < stories.length - 1) {
      setCurrentIndex((i) => i); // keep the index same because the array has shrunk
    } else {
      setCurrentIndex((i) => Math.max(0, i - 1));
    }
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  // Navigate previous
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Time ago helper for stories
  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // Exit animation
  const handleClose = () => {
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.25,
        ease: "power2.in",
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  };

  if (!activeStory) return null;

  const isVideo = activeStory.media_type === "video" || activeStory.media_urls?.[0]?.includes(".mp4") || activeStory.media_urls?.[0]?.includes(".webm");

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center md:p-4">
      <div ref={containerRef} className="relative w-full h-full md:max-w-[420px] md:aspect-[9/16] bg-black md:rounded-lg overflow-hidden flex flex-col justify-between shadow-2xl">
        <audio ref={audioRef} loop />
        
        {/* Progress bar and top details header */}
        <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/85 to-transparent z-20 space-y-3">
          {/* Progress Indicators */}
          <div className="flex gap-1.5 w-full">
            {stories.map((story, idx) => {
              let widthVal = "0%";
              if (idx < currentIndex) widthVal = "100%";
              if (idx === currentIndex) widthVal = `${progress}%`;

              return (
                <div key={story.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-white transition-all duration-100 ease-linear" style={{ width: widthVal }} />
                </div>
              );
            })}
          </div>

          {/* Author details and actions */}
          <div className="flex items-center justify-between text-white relative z-20">
            {/* Left side: Avatar, Name, Time Ago */}
            <div className="flex items-center gap-2">
              <img
                src={activeStory.author?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeStory.author?.display_name || "U")}&background=1A1A1A&color=fff`}
                alt={activeStory.author?.display_name || "User"}
                className="w-8 h-8 rounded-full object-cover border border-white/20"
              />
              <div className="flex flex-col text-left">
                <span className="font-label-md text-xs font-bold leading-none">{activeStory.author?.display_name}</span>
                <span className="font-caption text-[9px] text-white/60 mt-0.5">
                  {timeAgo(activeStory.created_at)}
                </span>
              </div>
            </div>

            {/* Right side: Actions */}
            <div className="flex items-center gap-1.5">
              {(isVideo || hasSoundtrack) && (
                <>
                  <button onClick={() => setIsPlaying(!isPlaying)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white relative z-20" title={isPlaying ? "Pause" : "Play"}>
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white relative z-20" title={isMuted ? "Unmute" : "Mute"}>
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                </>
              )}
              {user && activeStory?.author_id === user.id && (
                <button onClick={deleteCurrentStory} className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-red-400 hover:text-red-500 relative z-20" title="Delete Story">
                  <Trash2 size={16} />
                </button>
              )}
              <button onClick={handleClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white relative z-20" title="Close">
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Viewer Screen */}
        <div className="flex-1 w-full h-full flex items-center justify-center relative overflow-hidden">
          {isVideo ? (
            <video ref={videoRef} src={activeStory.media_urls?.[0]} autoPlay playsInline muted={videoMuted} loop
              className="w-full h-full object-contain" />
          ) : (
            <img src={activeStory.media_urls?.[0]} className="w-full h-full object-contain" alt="Story" />
          )}
        </div>

        {/* Navigation buttons */}
        <div className="absolute inset-y-0 left-0 w-12 flex items-center justify-center z-10">
          {currentIndex > 0 && (
            <button onClick={handlePrev} className="w-8 h-8 rounded-full bg-black/40 text-white hover:bg-black/60 flex items-center justify-center cursor-pointer transition-colors">
              <ChevronLeft size={20} />
            </button>
          )}
        </div>
        <div className="absolute inset-y-0 right-0 w-12 flex items-center justify-center z-10">
          <button onClick={handleNext} className="w-8 h-8 rounded-full bg-black/40 text-white hover:bg-black/60 flex items-center justify-center cursor-pointer transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Soundtrack Info overlay at bottom if exists */}
        {activeStory.soundtrack && (
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-10 flex items-center gap-2 text-white">
            <Music size={12} className="animate-spin text-white/80" style={{ animationDuration: "3s" }} />
            <span className="text-[10px] uppercase tracking-widest font-label-md">{activeStory.soundtrack}</span>
          </div>
        )}
      </div>
    </div>
  );
}
