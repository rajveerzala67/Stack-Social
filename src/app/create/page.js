"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowLeft, Zap, Music, RotateCw, Upload, Image as ImageIcon, X, Play, Pause, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCamera } from "@/hooks/useCamera";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

const SOUNDTRACKS = [
  { id: "none", title: "No Soundtrack", artist: "Original Audio", url: "" },
  { id: "blinding-lights", title: "Blinding Lights", artist: "The Weeknd", url: "/songs/Blinding lights.mp3" },
  { id: "jaiye-sajna", title: "Jaiye Sajna", artist: "Sajna Crew", url: "/songs/Jaiye Sajna.mp3" },
  { id: "majboor", title: "Majboor", artist: "Majboor Artist", url: "/songs/Majboor.mp3" },
  { id: "mr-bean", title: "Mr Bean Intro Music", artist: "Howard Goodall", url: "/songs/Mr Bean Intro Music .mp3" },
  { id: "rasputin", title: "Rasputin", artist: "Boney M.", url: "/songs/Rasputin.mp3" },
  { id: "ennasolla", title: "Ennasolla Thangamaga", artist: "Anirudh Ravichander", url: "/songs/ennasolla_thangamaga.mp3" },
  { id: "kantara", title: "Kantara Soundtrack", artist: "Ajaneesh Loknath", url: "/songs/kantara.mp3" },
  { id: "kingdom", title: "Kingdom Samrajya", artist: "Samrajya Crew", url: "/songs/kingdom_samrajya.mp3" }
];

// Client-side image compression utility
const compressImage = (file) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith("image/") || file.type === "image/gif") {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name || `post-${Date.now()}.jpg`, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.75
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export default function Create() {
  const pageRef = useRef(null);
  const flashRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const router = useRouter();
  const { user } = useAuth();

  const {
    videoRef,
    canvasRef,
    isActive: cameraActive,
    hasMultipleCameras,
    isRecording,
    startCamera,
    stopCamera,
    switchCamera,
    toggleTorch,
    captureFrame,
    startRecording,
    stopRecording,
    error: cameraError,
  } = useCamera();

  const [activeMode, setActiveMode] = useState("Image");
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(SOUNDTRACKS[0]);
  const [previewTrackId, setPreviewTrackId] = useState("none");
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [postSuccess, setPostSuccess] = useState(false);
  const [showCaptionEditor, setShowCaptionEditor] = useState(false);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      stopAudio();
    };
  }, []);

  // Stop audio preview
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setIsPlayingPreview(false);
    setPreviewTrackId("none");
  };

  // Play/Pause audio track preview
  const handlePlayPreview = (e, track) => {
    e.stopPropagation(); // Prevent row selection

    if (previewTrackId === track.id && isPlayingPreview) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      if (audioRef.current) {
        audioRef.current.src = track.url;
        audioRef.current.play().catch((err) => console.log("Audio playback error:", err));
        setPreviewTrackId(track.id);
        setIsPlayingPreview(true);
      }
    }
  };

  // Select track
  const handleSelectTrack = (track) => {
    setSelectedTrack(track);
    // Play or toggle the selected track preview in the background
    if (track.url) {
      if (audioRef.current) {
        if (previewTrackId === track.id && isPlayingPreview) {
          audioRef.current.pause();
          setIsPlayingPreview(false);
        } else {
          audioRef.current.src = track.url;
          audioRef.current.play().catch((err) => console.log("Audio play error:", err));
          setPreviewTrackId(track.id);
          setIsPlayingPreview(true);
        }
      }
    } else {
      stopAudio();
    }
  };

  // Shutter action handler
  const handleShutterClick = async () => {
    if (activeMode === "Image") {
      // 1. Picture capture
      if (flashRef.current) {
        gsap.fromTo(
          flashRef.current,
          { opacity: 0, display: "block" },
          {
            opacity: 1, duration: 0.08, yoyo: true, repeat: 1,
            onComplete: () => gsap.set(flashRef.current, { display: "none" }),
          }
        );
      }

      const blob = await captureFrame();
      if (blob) {
        setSelectedFile(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        setShowCaptionEditor(true);
        stopCamera();
      }
    } else {
      // 2. Video recording (Story or Reel)
      if (!isRecording) {
        // Start recording
        await startRecording();
      } else {
        // Stop recording
        const videoBlob = await stopRecording();
        if (videoBlob) {
          setSelectedFile(videoBlob);
          setPreviewUrl(URL.createObjectURL(videoBlob));
          setShowCaptionEditor(true);
          stopCamera();
        }
      }
    }
  };

  // Handle file selection from gallery
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const compressed = await compressImage(file);
    setSelectedFile(compressed);
    setPreviewUrl(URL.createObjectURL(compressed));
    setShowCaptionEditor(true);
    stopCamera();
  };

  // Switch camera modes
  const handleSwitchMode = (mode) => {
    if (mode === activeMode) return;
    setActiveMode(mode);

    if (videoRef.current) {
      gsap.fromTo(
        videoRef.current,
        { filter: "brightness(0.7) blur(8px)", scale: 0.98 },
        { filter: "brightness(1) blur(0px)", scale: 1, duration: 0.5, ease: "power2.out" }
      );
    }
  };

  // Flip camera with animation
  const handleFlipCamera = (e) => {
    const btn = e.currentTarget;
    gsap.to(btn, { rotate: "+=180", duration: 0.5, ease: "power2.inOut" });
    switchCamera();
  };

  // Toggle flash
  const handleFlashToggle = () => {
    const next = !isFlashActive;
    setIsFlashActive(next);
    toggleTorch(next);
  };

  // Discard and go back to camera
  const handleDiscard = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption("");
    setShowCaptionEditor(false);
    setPostError("");
    stopAudio();
    startCamera();
  };

  // POST the content
  const handlePost = async () => {
    if (!selectedFile || !user) return;
    setIsPosting(true);
    setPostError("");
    stopAudio(); // Stop preview track on post

    try {
      // 1. Upload file to storage
      const bucket = activeMode === "Story" ? "stories" : activeMode === "Reel" ? "reels" : "posts";
      const isVideo = selectedFile.type?.startsWith("video/") || activeMode === "Reel";
      const fileExt = isVideo ? "mp4" : "jpg";
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, selectedFile, {
          contentType: selectedFile.type || (isVideo ? "video/mp4" : "image/jpeg"),
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(uploadData.path);
      const publicUrl = urlData.publicUrl;

      // 3. Create post record
      const postType = activeMode === "Story" ? "story" : activeMode === "Reel" ? "reel" : "post";
      const expiresAt = postType === "story" ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;

      const { error: postError } = await supabase.from("posts").insert({
        author_id: user.id,
        type: postType,
        caption: caption,
        media_urls: [publicUrl],
        media_type: isVideo ? "video" : "image",
        soundtrack: selectedTrack.id !== "none" ? `${selectedTrack.title} - ${selectedTrack.artist}` : "",
        aspect_ratio: activeMode === "Reel" ? "9/16" : "4/5",
        expires_at: expiresAt,
      });

      if (postError) throw postError;

      setPostSuccess(true);
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      console.error("Post error:", err);
      setPostError(err.message || "Failed to create post. Try again.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div ref={pageRef} className="min-h-screen flex flex-col items-center justify-center p-6 md:p-margin-desktop relative bg-brand-ivory">
      {/* Hidden audio element for previews */}
      <audio ref={audioRef} loop className="hidden" />

      {/* Flash Overlay */}
      <div ref={flashRef} className="fixed inset-0 bg-white z-[100] pointer-events-none hidden" />

      {/* Header Controls */}
      <div className="fixed top-0 right-0 left-0 lg:left-64 flex justify-between items-center px-margin-mobile md:px-margin-desktop h-20 z-40 bg-surface/50 backdrop-blur-md">
        <button onClick={() => showCaptionEditor ? handleDiscard() : router.back()} className="flex items-center gap-2 group cursor-pointer">
          <ArrowLeft className="text-primary group-hover:-translate-x-1 transition-transform" size={20} />
          <span className="font-label-md text-label-md uppercase tracking-widest text-primary">
            {showCaptionEditor ? "Discard" : "Cancel"}
          </span>
        </button>
        <div className="flex items-center gap-stack-sm">
          {!showCaptionEditor && activeMode === "Image" && (
            <button onClick={handleFlashToggle}
              className={`w-10 h-10 flex items-center justify-center hover:bg-surface-container transition-colors rounded-full ${isFlashActive ? "text-yellow-500" : "text-primary"}`}>
              <Zap size={20} className={isFlashActive ? "fill-current" : ""} />
            </button>
          )}
          {showCaptionEditor && (
            <button onClick={handlePost} disabled={isPosting}
              className="px-6 py-2 bg-primary text-on-primary font-label-md text-label-md rounded-full hover:opacity-90 active:scale-95 transition-all uppercase tracking-widest font-bold disabled:opacity-50 flex items-center gap-2 cursor-pointer">
              {isPosting ? <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" /> : "POST"}
            </button>
          )}
        </div>
      </div>

      {/* Creator Studio */}
      <div className="w-full max-w-4xl flex flex-col items-center mt-12">
        {/* Success message */}
        {postSuccess && (
          <div className="fixed inset-0 z-50 bg-brand-ivory/90 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center mx-auto">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="font-serif font-bold text-2xl text-primary">Posted!</p>
              <p className="font-caption text-secondary">Redirecting to your feed...</p>
            </div>
          </div>
        )}

        {postError && (
          <div className="w-full max-w-md mb-4 bg-error-container/30 border border-error/20 text-error text-caption p-3.5 rounded-md flex items-center gap-2.5">
            <X size={16} className="shrink-0" /><span>{postError}</span>
          </div>
        )}

        {/* Caption Editor View */}
        {showCaptionEditor && previewUrl ? (
          <div className="w-full flex flex-col md:flex-row gap-8 items-start bg-surface border border-outline-variant p-6 rounded-sm shadow-sm">
            <div className="w-full md:w-1/2 aspect-[4/5] rounded-xl overflow-hidden border border-outline-variant bg-black relative">
              {selectedFile?.type?.startsWith("video/") ? (
                <video src={previewUrl} className="w-full h-full object-cover" controls autoPlay loop muted={selectedTrack.id !== "none" && isPlayingPreview} />
              ) : (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              )}
              {selectedTrack.id !== "none" && (
                <button
                  onClick={(e) => handlePlayPreview(e, selectedTrack)}
                  className="absolute top-4 left-4 z-20 backdrop-blur-md bg-black/60 hover:bg-black/80 border border-white/20 text-white px-3 py-1.5 rounded-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
                >
                  <Music className={`w-3.5 h-3.5 ${isPlayingPreview ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }} />
                  <span>{isPlayingPreview ? "Stop Music" : "Play Music"}</span>
                </button>
              )}
            </div>
            <div className="w-full md:w-1/2 space-y-6">
              <div className="space-y-2">
                <label className="font-label-md text-[11px] uppercase tracking-wider text-secondary">Caption</label>
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant p-4 text-body-md font-body-md focus:outline-none focus:border-primary transition-colors text-primary rounded-sm resize-none h-32"
                  placeholder="Write a caption..." />
              </div>
              
              {/* Soundtrack option in Caption view */}
              <div className="space-y-2">
                <label className="font-label-md text-[11px] uppercase tracking-wider text-secondary">Soundtrack</label>
                <button onClick={() => setShowMusicModal(true)}
                  className="w-full bg-surface-container-lowest border border-outline-variant py-3 px-4 text-body-md text-primary rounded-sm text-left flex justify-between items-center cursor-pointer hover:border-primary transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Music size={16} className="text-secondary" />
                    <span>{selectedTrack.id === "none" ? "Choose Soundtrack" : `${selectedTrack.title} — ${selectedTrack.artist}`}</span>
                  </div>
                  <ChevronRightIcon />
                </button>
              </div>

              <div className="flex items-center gap-2 text-sm text-secondary pt-2">
                <span className="font-label-md text-[11px] uppercase tracking-wider">Type:</span>
                <span className="font-bold text-primary">{activeMode}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-outline-variant/30 w-full">
                <button
                  onClick={handleDiscard}
                  disabled={isPosting}
                  className="flex-1 py-3 border border-outline-variant text-primary font-label-md text-label-md rounded-full uppercase tracking-widest font-bold hover:bg-surface-container-low active:scale-95 transition-all cursor-pointer text-center"
                >
                  Discard
                </button>
                <button
                  onClick={handlePost}
                  disabled={isPosting}
                  className="flex-1 py-3 bg-primary text-on-primary font-label-md text-label-md rounded-full uppercase tracking-widest font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPosting ? <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" /> : "POST"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Camera Viewfinder */
          <div className="relative w-full aspect-[4/5] md:max-h-[640px] md:w-auto bg-black rounded-xl overflow-hidden shadow-2xl group border border-outline-variant/30">
            {/* Camera or Error state */}
            {cameraError ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container gap-4 p-8">
                <ImageIcon size={48} className="text-secondary" />
                <p className="font-body-md text-secondary text-center">Camera not available. Use the gallery to upload a file.</p>
                <button onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-primary text-on-primary font-label-md text-label-md rounded-full uppercase tracking-widest font-bold cursor-pointer hover:opacity-90 active:scale-95 transition-all flex items-center gap-2">
                  <Upload size={18} /> Choose from Gallery
                </button>
              </div>
            ) : (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-90" />

                {/* Viewfinder Overlays */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t border-l border-white/40" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t border-r border-white/40" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b border-l border-white/40" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b border-r border-white/40" />

                {/* Center crosshair */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center opacity-30 pointer-events-none">
                  <div className="w-px h-full bg-white" />
                  <div className="h-px w-full bg-white absolute" />
                </div>

                {/* Controls Overlay */}
                <div className="absolute inset-0 flex flex-col justify-between p-stack-sm select-none">
                  {/* Soundtrack Picker Button */}
                  <div className="flex justify-center">
                    <button onClick={() => setShowMusicModal(true)}
                      className="backdrop-blur-md bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full border border-white/20 flex items-center gap-2 group active:scale-95 transition-all text-white text-xs uppercase tracking-widest font-bold cursor-pointer outline-none">
                      <Music size={14} className="text-white" />
                      <span>{selectedTrack.id === "none" ? "Choose Soundtrack" : selectedTrack.title}</span>
                    </button>
                  </div>

                  {/* Bottom Controls */}
                  <div className="space-y-stack-sm mb-4">
                    {/* Mode Selectors */}
                    <div className="flex justify-center items-center gap-8 text-white/50">
                      {["Story", "Image", "Reel"].map((m) => (
                        <button key={m} onClick={() => handleSwitchMode(m)}
                          className={`font-label-md text-[10px] tracking-[0.2em] uppercase transition-all hover:text-white cursor-pointer ${
                            activeMode === m ? "text-white font-bold border-b border-white pb-1" : "text-white/50"
                          }`}>{m}</button>
                      ))}
                    </div>

                    {/* Shutter Bar */}
                    <div className="flex items-center justify-between px-gutter">
                      {/* Gallery */}
                      <button onClick={() => fileInputRef.current?.click()}
                        className="w-12 h-12 rounded-lg border-2 border-white/20 overflow-hidden active:scale-90 transition-transform cursor-pointer bg-white/10 shrink-0 flex items-center justify-center">
                        <Upload size={20} className="text-white" />
                      </button>

                      {/* Shutter Button */}
                      <button onClick={handleShutterClick}
                        className="relative w-20 h-20 flex items-center justify-center cursor-pointer group outline-none border-none select-none">
                        {/* Outer ring */}
                        <div className={`absolute inset-0 rounded-full border transition-all duration-300 pointer-events-none ${
                          isRecording ? "border-red-500 scale-110 animate-pulse" : "border-white/35 scale-100 group-hover:scale-105 group-active:scale-95"
                        }`} />
                        {/* Inner action circle */}
                        <div className={`rounded-full bg-white ring-2 ring-white/10 transition-all duration-300 flex items-center justify-center pointer-events-none ${
                          isRecording ? "w-12 h-12" : "w-16 h-16 group-active:scale-95"
                        }`}>
                          {activeMode !== "Image" && (
                            <div className={`transition-all duration-300 ${
                              isRecording ? "bg-red-600 rounded-sm w-4 h-4" : "bg-red-500 rounded-full w-8 h-8"
                            }`} />
                          )}
                        </div>
                      </button>

                      {/* Flip Camera */}
                      {hasMultipleCameras ? (
                        <button onClick={handleFlipCamera}
                          className="w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 active:bg-white/30 transition-colors cursor-pointer shrink-0">
                          <RotateCw size={20} />
                        </button>
                      ) : (
                        <div className="w-12 h-12" />
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />

        {/* Hidden canvas for image capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Footer Text */}
        {!showCaptionEditor && (
          <div className="mt-stack-md text-center max-w-md">
            <p className="font-caption text-caption text-secondary uppercase tracking-[0.3em]">
              {isRecording ? "Recording video" : "Ready to capture"}
            </p>
            <h2 className="font-headline-lg text-headline-lg mt-2 italic text-primary">Define the Moment</h2>
          </div>
        )}
      </div>

      {/* Soundtrack Custom Selection Modal */}
      {showMusicModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant max-w-md w-full p-6 rounded-sm relative space-y-6 shadow-2xl">
            <button onClick={() => setShowMusicModal(false)} className="absolute top-4 right-4 text-secondary hover:text-primary cursor-pointer">
              <X size={20} />
            </button>
            <div className="text-center space-y-1">
              <span className="font-caption text-caption text-secondary uppercase tracking-[0.2em]">Music Studio</span>
              <h3 className="font-serif font-black text-2xl text-primary uppercase tracking-tighter">Choose Soundtrack</h3>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
              {SOUNDTRACKS.map((track) => {
                const isSelected = selectedTrack.id === track.id;
                const isPlayingThis = previewTrackId === track.id && isPlayingPreview;

                return (
                  <div key={track.id} onClick={() => handleSelectTrack(track)}
                    className={`flex items-center justify-between p-3.5 border rounded-sm transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-surface-container-low"
                        : "border-outline-variant/30 hover:border-primary bg-surface-container-lowest"
                    }`}>
                    <div className="flex items-center gap-3">
                      {track.url ? (
                        <button onClick={(e) => handlePlayPreview(e, track)}
                          className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center hover:opacity-90 active:scale-95 transition-all cursor-pointer">
                          {isPlayingThis ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current ml-0.5" />}
                        </button>
                      ) : (
                        <div className="w-8 h-8 rounded-full border border-dashed border-outline-variant flex items-center justify-center text-secondary">
                          <X size={14} />
                        </div>
                      )}
                      <div className="text-left">
                        <p className="font-body-md font-bold text-xs text-primary leading-none">{track.title}</p>
                        <p className="font-caption text-[10px] text-secondary mt-1">{track.artist}</p>
                      </div>
                    </div>
                    {isSelected && <Check size={16} className="text-primary shrink-0" />}
                  </div>
                );
              })}
            </div>
            
            <button onClick={() => setShowMusicModal(false)}
              className="w-full py-3 bg-primary text-on-primary font-label-md uppercase tracking-widest font-bold hover:opacity-90 active:scale-95 transition-all rounded-full cursor-pointer">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple Helper Icon Component
function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
  );
}
