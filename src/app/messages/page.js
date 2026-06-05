"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import gsap from "gsap";
import { Search, Phone, Video, Info, Plus, Smile, Send, Image as ImageIcon, Loader2, X, Mic, MicOff, Play, Pause, Square, Trash2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePresence } from "@/hooks/usePresence";
import { useCall } from "@/context/CallContext";
import { supabase } from "@/lib/supabaseClient";

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😋", 
  "😛", "😜", "🤪", "🤔", "🤫", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", 
  "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", 
  "😎", "🤓", "🧐", "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", 
  "👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘", "👌", "👈", "👉", "👆", "👇", "✋", 
  "🤚", "🖐️", "🖖", "👋", "✍️", "👏", "🙌", "👐", "🙏", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", 
  "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "🔥", "✨", "🎉", "🚀", 
  "💡", "💯", "🌟", "🌈", "☀️", "❄️", "🎈", "🎁", "🎨", "📷", "✈️", "🌍"
];

// Client-side image compression utility
const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.75) => {
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
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name || `msg-${Date.now()}.jpg`, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

function MessagesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const recipientIdParam = searchParams.get("recipient");

  const { user } = useAuth();
  const { isOnline } = usePresence(user?.id);
  const { startCall } = useCall();

  const messagesEndRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null); // { id, member: profile }
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // New Chat & Voice recording states
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Typing indicators
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const [isLocalTyping, setIsLocalTyping] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const activeAudioRef = useRef(null);
  const audioDurationRef = useRef(0);
  const recordingStartTimeRef = useRef(null);

  const activeConvRef = useRef(activeConv);
  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  const handleEmojiClick = (emoji) => {
    setInputText((prev) => prev + emoji);
  };

  // Load conversations
  const loadConversations = useCallback(async (selectRecipientId = null) => {
    if (!user) {
      setLoadingConvs(false);
      return;
    }
    setLoadingConvs(true);

    try {
      // Fetch other available users/creators to start conversation with
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .neq("id", user.id)
        .limit(30);
      setAvailableUsers(profilesData || []);

      // 1. Fetch conversations this user is member of
      const { data: memberOf } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);

      const convIds = (memberOf || []).map((m) => m.conversation_id);

      if (convIds.length === 0 && !selectRecipientId) {
        setConversations([]);
        setLoadingConvs(false);
        return;
      }

      // 2. Fetch conversations with details
      let { data: convData } = convIds.length > 0 ? await supabase
        .from("conversations")
        .select(`
          id,
          updated_at,
          conversation_members!inner(
            user:profiles!user_id(id, display_name, username, avatar_url)
          )
        `)
        .in("id", convIds) : { data: [] };

      // Filter out current user from members to get recipient info
      const processedConvs = (convData || []).map((c) => {
        const otherMember = c.conversation_members.find((m) => m.user?.id !== user.id)?.user;
        return {
          id: c.id,
          updated_at: c.updated_at,
          member: otherMember,
        };
      }).filter((c) => c.member); // ensure member exists

      // Sort by updated_at
      processedConvs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setConversations(processedConvs);

      // Handle query param for starting new conversation or selecting existing
      if (selectRecipientId) {
        // Find existing conversation with this user
        const existing = processedConvs.find((c) => c.member.id === selectRecipientId);
        if (existing) {
          setActiveConv(existing);
        } else {
          // Fetch user details for recipient
          const { data: recipientProfile } = await supabase
            .from("profiles")
            .select("id, display_name, username, avatar_url")
            .eq("id", selectRecipientId)
            .single();

          if (recipientProfile) {
            // Create a temporary conversation item in state, will be created in DB on first message
            const tempConv = {
              id: "temp",
              member: recipientProfile,
              isTemp: true,
            };
            setActiveConv(tempConv);
            setConversations((prev) => [tempConv, ...prev]);
          }
        }
      } else if (processedConvs.length > 0 && !activeConvRef.current) {
        setActiveConv(processedConvs[0]);
      }
    } catch (err) {
      console.error("Load conversations error:", err);
    } finally {
      setLoadingConvs(false);
    }
  }, [user]);

  useEffect(() => {
    loadConversations(recipientIdParam);
  }, [loadConversations, recipientIdParam]);

  // Load messages for active conversation
  const loadMessages = useCallback(async () => {
    if (!activeConv || activeConv.isTemp) {
      setMessages([]);
      return;
    }

    setLoadingMsgs(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConv.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error("Load messages error:", err);
    } finally {
      setLoadingMsgs(false);
    }
  }, [activeConv]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Scroll to bottom helper
  const scrollToBottom = useCallback((animate = true) => {
    if (!streamRef.current) return;
    if (animate) {
      streamRef.current.scrollTo({
        top: streamRef.current.scrollHeight,
        behavior: "smooth",
      });
    } else {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, scrollToBottom]);

  // Subscribe to real-time messages & typing indicator
  useEffect(() => {
    if (!activeConv || activeConv.isTemp) return;

    const channel = supabase.channel(`conversation:${activeConv.id}`);

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConv.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            // Avoid duplicate additions
            if (prev.find((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });

          // Update conversations list sorting in UI
          setConversations((prev) => {
            const updated = prev.map((c) => {
              if (c.id === activeConv.id) {
                return { ...c, updated_at: new Date().toISOString() };
              }
              return c;
            });
            return [...updated].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
          });

          // Animate new bubble
          setTimeout(() => {
            const bubble = streamRef.current?.lastElementChild;
            if (bubble) {
              gsap.from(bubble, {
                opacity: 0,
                y: 15,
                scale: 0.95,
                duration: 0.4,
                ease: "back.out(1.2)",
              });
            }
            scrollToBottom();
          }, 50);
        }
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.userId !== user?.id) {
          setTypingUser(payload.userName);
          setIsTyping(payload.isTyping);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [activeConv, user, scrollToBottom]);

  // Broadcast local typing state
  useEffect(() => {
    if (!activeConv || activeConv.isTemp || !user) return;

    const channel = supabase.channel(`conversation:${activeConv.id}`);
    
    // Simple debounce for typing broadcast
    const delay = setTimeout(() => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "typing",
            payload: {
              userId: user.id,
              userName: user.email.split("@")[0],
              isTyping: isLocalTyping,
            },
          });
        }
      });
    }, 100);

    return () => clearTimeout(delay);
  }, [isLocalTyping, activeConv, user]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!isLocalTyping) {
      setIsLocalTyping(true);
    }
    // Set timeout to clear typing state
    const timer = setTimeout(() => {
      setIsLocalTyping(false);
    }, 2000);
    return () => clearTimeout(timer);
  };

  // Send Message
  const handleSendMessage = async () => {
    if (!inputText.trim() || !user || !activeConv) return;
    const text = inputText;
    setInputText("");
    setIsLocalTyping(false);

    try {
      let convId = activeConv.id;

      // 1. If temp conversation, create it in DB first
      if (activeConv.isTemp) {
        // Create conversation
        const { data: newConv, error: cError } = await supabase
          .from("conversations")
          .insert({ type: "direct" })
          .select()
          .single();

        if (cError) throw cError;
        convId = newConv.id;

        // Add members
        await supabase.from("conversation_members").insert([
          { conversation_id: convId, user_id: user.id },
          { conversation_id: convId, user_id: activeConv.member.id },
        ]);

        // Update local state
        const realConv = {
          id: convId,
          member: activeConv.member,
        };
        setActiveConv(realConv);
        setConversations((prev) =>
          prev.map((c) => (c.id === "temp" ? realConv : c))
        );
      }

      // 2. Insert message into DB
      const { data: newMsg, error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: convId,
          sender_id: user.id,
          type: "text",
          content: text,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Optimistically add message
      setMessages((prev) => {
        if (prev.find((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // 3. Update conversation last updated timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);

      // Instantly update conversations list sorting in UI
      setConversations((prev) => {
        const updated = prev.map((c) => {
          if (c.id === convId || (convId === "temp" && c.isTemp)) {
            return { ...c, id: convId, isTemp: false, updated_at: new Date().toISOString() };
          }
          return c;
        });
        return [...updated].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      });

    } catch (err) {
      console.error("Send message error:", err.message || err, err);
    }
  };

  // Upload and Share File
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeConv) return;

    setUploadingFile(true);
    try {
      let convId = activeConv.id;
      // If temp, create conversation first
      if (activeConv.isTemp) {
        const { data: newConv } = await supabase.from("conversations").insert({ type: "direct" }).select().single();
        convId = newConv.id;
        await supabase.from("conversation_members").insert([
          { conversation_id: convId, user_id: user.id },
          { conversation_id: convId, user_id: activeConv.member.id },
        ]);
        const realConv = { id: convId, member: activeConv.member };
        setActiveConv(realConv);
        setConversations((prev) => prev.map((c) => (c.id === "temp" ? realConv : c)));
      }

      // Compress image if it is an image (max 1080x1350, 75% quality)
      const isImg = file.type.startsWith("image/");
      const compressedFile = isImg ? await compressImage(file, 1080, 1350, 0.75) : file;
      const fileExt = isImg ? "jpg" : file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const bucket = "posts"; // Using the posts bucket to store attachments

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, compressedFile, { contentType: isImg ? "image/jpeg" : file.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      const fileUrl = data.publicUrl;

      // Send attachment message
      const isVideo = file.type.startsWith("video/");
      const { data: newMsg, error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: convId,
          sender_id: user.id,
          type: isVideo ? "video" : "image",
          content: file.name,
          media_url: fileUrl,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      setMessages((prev) => {
        if (prev.find((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Update conversations updated_at
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);

      // Instantly update conversations list sorting in UI
      setConversations((prev) => {
        const updated = prev.map((c) => {
          if (c.id === convId) {
            return { ...c, updated_at: new Date().toISOString() };
          }
          return c;
        });
        return [...updated].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      });

    } catch (err) {
      console.error("File upload message error:", err);
      alert("Failed to share file.");
    } finally {
      setUploadingFile(false);
    }
  };

  // Audio / Video Calls
  const handleCall = (callType) => {
    if (!activeConv || activeConv.isTemp) return;
    startCall(activeConv.id, activeConv.member.id, callType);
  };

  const handleStartChatWithUser = async (otherUser) => {
    // Check if we already have an active conversation with this user
    const existing = conversations.find((c) => c.member.id === otherUser.id);
    if (existing) {
      setActiveConv(existing);
    } else {
      // Create a temporary conversation in state
      const tempConv = {
        id: "temp",
        member: otherUser,
        isTemp: true,
      };
      setActiveConv(tempConv);
      // Prepend to conversations list
      setConversations((prev) => {
        const filtered = prev.filter(c => c.id !== "temp");
        return [tempConv, ...filtered];
      });
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        
        if (audioBlob.size > 1000) {
          await handleSendVoiceMessage(audioBlob);
        }
      };
      
      mediaRecorder.start();
      setIsRecordingAudio(true);
      setAudioDuration(0);
      recordingStartTimeRef.current = Date.now();
      
      recordingTimerRef.current = setInterval(() => {
        setAudioDuration(Math.round((Date.now() - recordingStartTimeRef.current) / 1000));
      }, 1000);
      
    } catch (err) {
      console.error("Failed to start audio recording:", err);
      alert("Microphone permission denied or not available.");
    }
  };

  const stopAudioRecording = (cancel = false) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    
    if (recordingStartTimeRef.current) {
      audioDurationRef.current = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      if (cancel) {
        mediaRecorderRef.current.onstop = () => {
          mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        };
      }
      mediaRecorderRef.current.stop();
    }
    
    setIsRecordingAudio(false);
  };

  const handleSendVoiceMessage = async (audioBlob) => {
    if (!user || !activeConv) return;
    setUploadingFile(true);
    try {
      let convId = activeConv.id;
      if (activeConv.isTemp) {
        const { data: newConv } = await supabase.from("conversations").insert({ type: "direct" }).select().single();
        convId = newConv.id;
        await supabase.from("conversation_members").insert([
          { conversation_id: convId, user_id: user.id },
          { conversation_id: convId, user_id: activeConv.member.id },
        ]);
        const realConv = { id: convId, member: activeConv.member };
        setActiveConv(realConv);
        setConversations((prev) => prev.map((c) => (c.id === "temp" ? realConv : c)));
      }

      const fileExt = "webm";
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const bucket = "posts";

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, audioBlob, { contentType: "audio/webm" });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      const fileUrl = data.publicUrl;

      // Send voice message
      const { data: newMsg, error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: convId,
          sender_id: user.id,
          type: "voice",
          content: `Voice Message (${formatDuration(audioDurationRef.current)})`,
          media_url: fileUrl,
        })
        .select()
        .single();

      if (msgError) throw msgError;

      setMessages((prev) => {
        if (prev.find((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Update conversations updated_at
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);

      // Instantly update conversations list sorting in UI
      setConversations((prev) => {
        const updated = prev.map((c) => {
          if (c.id === convId) {
            return { ...c, updated_at: new Date().toISOString() };
          }
          return c;
        });
        return [...updated].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      });

    } catch (err) {
      console.error("Voice message upload error:", err);
      alert("Failed to send voice message.");
    } finally {
      setUploadingFile(false);
      setAudioDuration(0);
    }
  };

  const togglePlayVoice = (msgId, url) => {
    if (playingAudioId === msgId) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      const audio = new Audio(url);
      activeAudioRef.current = audio;
      setPlayingAudioId(msgId);
      audio.play().catch(e => console.log("Failed to play audio:", e));
      audio.onended = () => {
        setPlayingAudioId(null);
      };
    }
  };

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (activeAudioRef.current) activeAudioRef.current.pause();
    };
  }, []);

  return (
    <div className="flex w-full min-w-0 h-[calc(100vh-8rem)] lg:h-screen overflow-hidden">
      {/* Conversation List (Left Pane) */}
      <section className={`h-full flex-col border-r border-outline-variant bg-surface-container-lowest shrink-0 ${activeConv ? "hidden md:flex md:w-[380px]" : "w-full md:w-[380px] flex"}`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-outline-variant">
          <h2 className="font-headline-lg text-headline-lg text-primary">Messages</h2>
          <button onClick={() => setShowNewChatModal(true)}
            className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-primary cursor-pointer"
            title="New Chat">
            <Plus size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4">
          <div className="relative flex items-center">
            <Search className="absolute left-3 text-secondary" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary transition-all text-primary"
              placeholder="Search conversations"
            />
          </div>
        </div>

        {/* Online Now Row */}
        {availableUsers.length > 0 && (
          <div className="px-6 py-2 border-b border-outline-variant/30 shrink-0">
            <span className="font-caption text-[10px] text-secondary uppercase tracking-[0.2em]">Online Now</span>
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-3">
              {availableUsers
                .filter(u => isOnline(u.id))
                .map((u) => (
                  <div key={u.id} onClick={() => handleStartChatWithUser(u)}
                    className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group">
                    <div className="relative">
                      <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.display_name || "U")}&background=1A1A1A&color=fff`}
                        className="w-11 h-11 rounded-full object-cover border border-outline-variant group-hover:border-primary transition-colors" alt="" />
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary border-2 border-surface-container-lowest rounded-full"></div>
                    </div>
                    <span className="text-[10px] font-medium text-primary truncate max-w-[50px] leading-tight text-center">
                      {u.display_name.split(" ")[0]}
                    </span>
                  </div>
                ))}
              {availableUsers.filter(u => isOnline(u.id)).length === 0 && (
                <p className="text-[10px] text-secondary/60 italic py-1">No online curators</p>
              )}
            </div>
          </div>
        )}

        {/* Conversation Items */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-2">
          {loadingConvs ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin text-secondary" size={20} />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-center text-xs text-secondary mt-8 italic">No active conversations</p>
          ) : (
            conversations
              .filter((c) => c.member.display_name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((conv) => {
                const isActive = activeConv?.id === conv.id;
                const isUserOnline = isOnline(conv.member.id);
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConv(conv)}
                    className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-all border-l-2 ${
                      isActive ? "bg-surface-container-low border-primary" : "hover:bg-surface-container-low border-transparent"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        alt={conv.member.display_name}
                        className="w-14 h-14 rounded-full object-cover"
                        src={conv.member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.member.display_name || "U")}&background=1A1A1A&color=fff`}
                      />
                      {isUserOnline && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-primary border-2 border-surface-container-lowest rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span className="font-body-md font-bold text-primary truncate">{conv.member.display_name}</span>
                      </div>
                      <p className="font-caption text-secondary truncate">@{conv.member.username}</p>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </section>

      {/* Active Chat Area (Right Pane) */}
      <section className={`flex-1 min-w-0 h-full flex-col bg-background relative md:border-l border-outline-variant ${activeConv ? "flex" : "hidden md:flex"}`}>
        {activeConv ? (
          <>
            {/* Chat Header */}
            <header className="h-20 flex items-center justify-between px-4 md:px-6 lg:px-margin-desktop border-b border-outline-variant bg-surface/80 backdrop-blur-xl sticky top-0 z-10">
              <div className="flex items-center gap-4">
                {/* Back Button for Mobile */}
                <button onClick={() => setActiveConv(null)}
                  className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-primary cursor-pointer md:hidden mr-1"
                  title="Back to conversations">
                  <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                  <img
                    alt={activeConv.member.display_name}
                    className="w-full h-full object-cover"
                    src={activeConv.member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeConv.member.display_name || "U")}&background=1A1A1A&color=fff`}
                  />
                </div>
                <div>
                  <h3 className="font-body-md font-bold text-primary">{activeConv.member.display_name}</h3>
                  <button onClick={() => router.push(`/profile?id=${activeConv.member.id}`)}
                    className="font-caption text-caption text-secondary hover:text-primary transition-colors underline-offset-4 hover:underline uppercase tracking-widest block text-left">
                    View Profile
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleCall("voice")} disabled={activeConv.isTemp}
                  className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-primary cursor-pointer disabled:opacity-30">
                  <Phone size={20} />
                </button>
                <button onClick={() => handleCall("video")} disabled={activeConv.isTemp}
                  className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-primary cursor-pointer disabled:opacity-30">
                  <Video size={20} />
                </button>
              </div>
            </header>

            {/* Message Stream */}
            <div ref={streamRef} className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-margin-desktop py-4 md:py-stack-md flex flex-col gap-gutter no-scrollbar bg-brand-ivory">
              {loadingMsgs ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2 p-8">
                  <span className="font-serif font-black text-2xl text-primary/30">STACK SOCIAL</span>
                  <p className="text-secondary text-xs">No messages here yet. Say hello!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isMe ? "items-end self-end" : "items-start"}`}
                    >
                      {/* Text */}
                      {msg.type === "text" && (
                        <div className={`p-4 rounded-xl text-body-md break-words whitespace-pre-wrap ${
                          isMe
                            ? "bg-primary text-on-primary rounded-br-none"
                            : "bg-surface-container-lowest border border-outline-variant text-primary rounded-bl-none shadow-sm"
                        }`}>
                          {msg.content}
                        </div>
                      )}

                      {/* Call Log Message */}
                      {msg.type === "call" && (() => {
                        const status = msg.media_metadata?.status || "ended";
                        const duration = msg.media_metadata?.duration || 0;
                        const callType = msg.media_metadata?.call_type || "voice";
                        
                        const isMissed = status === "missed";
                        const isRejected = status === "rejected";
                        
                        const CallIcon = callType === "video" ? Video : Phone;
                        
                        return (
                          <div className={`p-4 rounded-xl flex items-center gap-3.5 min-w-[220px] shadow-sm border ${
                            isMe 
                              ? "bg-primary text-on-primary border-white/10 rounded-br-none" 
                              : "bg-surface-container-lowest border-outline-variant text-primary rounded-bl-none"
                          }`}>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                              isMissed 
                                ? "bg-rose-500/15 text-rose-500" 
                                : isRejected 
                                ? "bg-zinc-500/15 text-zinc-500" 
                                : "bg-emerald-500/15 text-emerald-500"
                            }`}>
                              <CallIcon size={16} />
                            </div>
                            <div className="flex-1 flex flex-col justify-center text-left">
                              <span className="text-xs font-bold font-label-md uppercase tracking-wider block">
                                {callType === "video" ? "Video Call" : "Voice Call"}
                              </span>
                              <span className={`text-[10px] leading-tight ${isMe ? "text-white/70" : "text-secondary"}`}>
                                {isMissed ? "Missed call" : isRejected ? "Call declined" : `Call ended • ${formatDuration(duration)}`}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Voice Attachment */}
                      {msg.type === "voice" && (() => {
                        const isPlayingThis = playingAudioId === msg.id;
                        return (
                          <div className={`p-4 rounded-xl flex items-center gap-3 min-w-[200px] shadow-sm ${
                            isMe
                              ? "bg-primary text-on-primary rounded-br-none"
                              : "bg-surface-container-lowest border border-outline-variant text-primary rounded-bl-none"
                          }`}>
                            <button 
                              onClick={() => togglePlayVoice(msg.id, msg.media_url)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95 ${
                                isMe ? "bg-white text-primary" : "bg-primary text-white"
                              }`}
                            >
                              {isPlayingThis ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current ml-0.5" />}
                            </button>
                            <div className="flex-1 flex flex-col justify-center text-left">
                              <span className="text-xs font-bold font-label-md">Voice Note</span>
                              <span className={`text-[10px] ${isMe ? "text-white/70" : "text-secondary"}`}>
                                {msg.content || "Voice recording"}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Image Attachment */}
                      {msg.type === "image" && (
                        <div className="rounded-xl overflow-hidden border border-outline-variant bg-surface shadow-sm">
                          <img alt="Attachment" className="w-full max-w-[280px] aspect-[4/5] object-cover" src={msg.media_url} />
                          <div className="p-3 border-t border-outline-variant/30">
                            <p className="font-label-md text-xs text-primary">{msg.content}</p>
                          </div>
                        </div>
                      )}

                      {/* Video Attachment */}
                      {msg.type === "video" && (
                        <div className="rounded-xl overflow-hidden border border-outline-variant bg-surface shadow-sm w-full max-w-[280px]">
                          <video src={msg.media_url} className="w-full aspect-[4/5] object-cover" controls />
                          <div className="p-3 border-t border-outline-variant/30">
                            <p className="font-label-md text-xs text-primary">{msg.content}</p>
                          </div>
                        </div>
                      )}

                      <span className="font-caption text-[9px] text-secondary mt-1 px-1">{time}</span>
                    </div>
                  );
                })
              )}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex items-center gap-2 text-secondary opacity-60 px-1 mt-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
                    <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                  <span className="font-caption text-caption">{typingUser} is typing</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <footer className="p-3 md:p-stack-md bg-background border-t border-outline-variant/20">
              {isRecordingAudio ? (
                /* Recording Mode UI */
                <div className="flex items-center justify-between max-w-container-max mx-auto bg-red-500/10 border border-red-500/30 rounded-2xl p-2 sm:p-3 shadow-sm text-red-600">
                  <div className="flex items-center gap-1.5 sm:gap-3">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping shrink-0"></span>
                    <span className="font-label-md text-xs uppercase tracking-widest font-bold hidden sm:inline">Recording voice note...</span>
                    <span className="font-label-md text-xs uppercase tracking-widest font-bold sm:hidden">Recording...</span>
                    <span className="font-body-md text-xs font-bold px-2 py-0.5 bg-red-500/15 rounded-md text-red-600 shrink-0">{formatDuration(audioDuration)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button 
                      onClick={() => stopAudioRecording(true)} 
                      className="p-2 hover:bg-red-500/10 text-red-600 rounded-xl transition-colors cursor-pointer shrink-0"
                      title="Cancel Recording"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button 
                      onClick={() => stopAudioRecording(false)} 
                      className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-2 sm:px-5 sm:py-2 rounded-xl transition-all active:scale-95 text-xs uppercase tracking-widest cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Square size={12} className="fill-current shrink-0" />
                      <span className="hidden sm:inline">Stop & Send</span>
                      <span className="sm:hidden">Send</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal Text Input UI */
                <div className="flex items-end gap-1.5 md:gap-2 max-w-container-max mx-auto bg-surface-container-lowest border border-outline-variant rounded-2xl p-1.5 md:p-2 shadow-sm focus-within:border-primary transition-colors relative">
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                    className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl hover:bg-surface-container-high transition-colors text-secondary shrink-0 cursor-pointer disabled:opacity-50">
                    {uploadingFile ? <Loader2 className="animate-spin" size={18} /> : <Plus size={20} />}
                  </button>
                  <textarea
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 py-2 md:py-3 px-1 md:px-2 bg-transparent border-none focus:ring-0 text-body-md placeholder:text-outline resize-none max-h-32 overflow-y-auto no-scrollbar outline-none text-primary min-w-0"
                    placeholder="Message..."
                    rows={1}
                  />
                  
                  {/* Emoji Picker Popover */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-16 right-16 w-64 bg-surface border border-outline-variant p-3.5 rounded-xl shadow-xl z-50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] uppercase font-bold text-secondary tracking-widest">Emojis</span>
                        <button onClick={() => setShowEmojiPicker(false)} className="text-secondary hover:text-primary cursor-pointer">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-8 gap-1.5 max-h-[160px] overflow-y-auto no-scrollbar select-none">
                        {EMOJIS.map((emoji, i) => (
                          <span key={i} onClick={() => handleEmojiClick(emoji)}
                            className="text-lg cursor-pointer hover:bg-surface-container-high p-1 rounded transition-colors text-center">
                            {emoji}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl hover:bg-surface-container-high transition-colors shrink-0 cursor-pointer ${
                      showEmojiPicker ? "text-primary bg-surface-container-high" : "text-secondary"
                    }`}
                    title="Emoji picker"
                  >
                    <Smile size={20} />
                  </button>

                  <button 
                    onClick={startAudioRecording}
                    className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl hover:bg-surface-container-high transition-colors text-secondary shrink-0 cursor-pointer"
                    title="Record voice message"
                  >
                    <Mic size={20} />
                  </button>
                  <button
                    onClick={handleSendMessage}
                    className="bg-primary text-on-primary font-bold p-2.5 md:px-6 md:py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all text-xs md:text-label-md uppercase tracking-normal md:tracking-widest cursor-pointer shrink-0 flex items-center justify-center w-10 h-10 md:w-auto md:h-auto"
                    title="Send message"
                  >
                    <span className="hidden md:inline">Send</span>
                    <Send size={16} className="md:hidden" />
                  </button>
                </div>
              )}
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-brand-ivory">
            <span className="font-serif font-black text-4xl text-primary/10 tracking-tighter">STACK SOCIAL</span>
            <p className="text-secondary/60 text-sm mt-2">Select a conversation to start chatting</p>
          </div>
        )}
      </section>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant rounded-sm max-w-sm w-full p-6 relative space-y-4 shadow-xl">
            <button onClick={() => setShowNewChatModal(false)} className="absolute top-4 right-4 text-secondary hover:text-primary cursor-pointer">
              <X size={20} />
            </button>
            <h3 className="font-serif font-bold text-xl text-primary">New Message</h3>
            
            <div className="relative flex items-center">
              <Search className="absolute left-3 text-secondary" size={16} />
              <input
                type="text"
                placeholder="Search curators..."
                className="w-full pl-9 pr-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-xs focus:outline-none focus:border-primary transition-all text-primary"
                onChange={(e) => {
                  const query = e.target.value.toLowerCase();
                  setSearchQuery(query);
                }}
              />
            </div>
            
            <div className="space-y-1 max-h-[250px] overflow-y-auto no-scrollbar">
              {availableUsers
                .filter(u => u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) || u.username.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((u) => (
                  <div key={u.id} onClick={() => { handleStartChatWithUser(u); setShowNewChatModal(false); }}
                    className="flex items-center gap-3 p-2 hover:bg-surface-container-low rounded-lg cursor-pointer transition-colors">
                    <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.display_name || "U")}&background=1A1A1A&color=fff`}
                      className="w-10 h-10 rounded-full object-cover" alt="" />
                    <div className="text-left">
                      <p className="font-body-md font-bold text-xs text-primary">{u.display_name}</p>
                      <p className="font-caption text-[10px] text-secondary">@{u.username}</p>
                    </div>
                  </div>
                ))}
              {availableUsers.length === 0 && (
                <p className="text-xs text-secondary/60 italic text-center py-4">No curators found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="flex h-screen bg-brand-ivory animate-pulse">
      {/* Sidebar List skeleton */}
      <div className="w-80 border-r border-outline-variant/30 flex flex-col bg-surface py-4 px-4 space-y-4">
        <div className="h-10 bg-surface-container rounded-sm w-3/4" />
        <div className="space-y-3 flex-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-outline-variant/10">
              <div className="w-10 h-10 rounded-full bg-surface-container" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-surface-container rounded-sm w-1/2" />
                <div className="h-2.5 bg-surface-container-low rounded-sm w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Empty Chat pane */}
      <div className="flex-1 flex flex-col bg-brand-ivory items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    </div>
  );
}

export default function Messages() {
  return (
    <Suspense fallback={<MessagesSkeleton />}>
      <MessagesContent />
    </Suspense>
  );
}
