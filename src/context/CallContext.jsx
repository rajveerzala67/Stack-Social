"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./AuthContext";
import { usePresence } from "@/hooks/usePresence";
import { 
  Phone, Video, PhoneOff, RotateCw, Mic, MicOff, VideoOff, 
  Volume2, Maximize2, Minimize2, Settings, Share2, Wifi, Loader2, Play 
} from "lucide-react";


const CallContext = createContext({
  activeCall: null, // { id, callerId, calleeId, type, status, isIncoming, conversationId }
  localStream: null,
  remoteStream: null,
  startCall: async () => {},
  acceptCall: async () => {},
  declineCall: async () => {},
  endCall: async () => {},
  switchCamera: () => {},
  toggleMute: () => {},
  toggleVideo: () => {},
  toggleScreenShare: async () => {},
  isMuted: false,
  isVideoEnabled: true,
  isScreenSharing: false,
  isFullscreen: false,
  callDuration: 0,
  connectionQuality: "good",
  audioDevices: [],
  videoDevices: [],
  selectedAudioDevice: "",
  selectedVideoDevice: "",
  switchDevice: async () => {},
});

export function CallProvider({ children }) {
  const { user } = useAuth();
  const { isOnline } = usePresence(user?.id);

  const [activeCall, setActiveCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState("good");

  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState("");
  const [selectedVideoDevice, setSelectedVideoDevice] = useState("");

  const [facingMode, setFacingMode] = useState("user");
  const [hasCameraSwitch, setHasCameraSwitch] = useState(false);

  const roomRef = useRef(null);
  const localStreamRef = useRef(null);
  const signalingChannelRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const ringToneRef = useRef(null);
  const canvasAnimIdRef = useRef(null);

  const activeCallRef = useRef(null);
  const connectingCallIdRef = useRef(null);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // Synth audio ring tones using Web Audio API (cross-browser, self-contained)
  const startRingtone = useCallback((isOutgoing = false) => {
    if (typeof window === "undefined") return;
    try {
      if (ringToneRef.current) ringToneRef.current.stop();

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      if (isOutgoing) {
        // Outgoing: US Ring cadenced sound (440Hz + 480Hz)
        osc1.frequency.value = 440;
        osc2.frequency.value = 480;
      } else {
        // Incoming: Electronic ring sound (320Hz + 480Hz pulsing)
        osc1.frequency.value = 320;
        osc2.frequency.value = 480;
      }

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

      osc1.start();
      osc2.start();

      let active = false;
      const cadenceInterval = setInterval(() => {
        if (!active) {
          // Play ring
          gainNode.gain.setTargetAtTime(isOutgoing ? 0.15 : 0.25, audioCtx.currentTime, 0.1);
          active = true;
          // Pulse the incoming ring frequency for flavor
          if (!isOutgoing) {
            osc1.frequency.setTargetAtTime(350, audioCtx.currentTime + 0.3, 0.05);
            osc1.frequency.setTargetAtTime(320, audioCtx.currentTime + 0.6, 0.05);
          }
        } else {
          // Stop ring
          gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
          active = false;
        }
      }, isOutgoing ? 2000 : 1000);

      // Start initially
      gainNode.gain.setTargetAtTime(isOutgoing ? 0.15 : 0.25, audioCtx.currentTime, 0.1);
      active = true;

      ringToneRef.current = {
        stop: () => {
          clearInterval(cadenceInterval);
          try {
            osc1.stop();
            osc2.stop();
            audioCtx.close();
          } catch {}
          ringToneRef.current = null;
        }
      };
    } catch (err) {
      console.warn("Failed to play ringtone audio:", err);
    }
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringToneRef.current) {
      ringToneRef.current.stop();
    }
  }, []);

  // Fetch available media devices
  const updateDeviceList = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      
      setAudioDevices(audioInputs);
      setVideoDevices(videoInputs);
      setHasCameraSwitch(videoInputs.length > 1);

      // Set default selected devices if not already selected
      if (audioInputs.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }
      if (videoInputs.length > 0 && !selectedVideoDevice) {
        setSelectedVideoDevice(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.error("Enumerate devices error:", err);
    }
  }, [selectedAudioDevice, selectedVideoDevice]);



  // Cleanup helper
  const cleanupCall = useCallback(() => {
    stopRingtone();
    
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (canvasAnimIdRef.current) {
      cancelAnimationFrame(canvasAnimIdRef.current);
      canvasAnimIdRef.current = null;
    }

    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (signalingChannelRef.current) {
      const channelToUnsubscribe = signalingChannelRef.current;
      signalingChannelRef.current = null;
      setTimeout(() => {
        channelToUnsubscribe.unsubscribe();
      }, 2000);
    }

    connectingCallIdRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setIsMuted(false);
    setIsVideoEnabled(true);
    setIsScreenSharing(false);
    setIsFullscreen(false);
    setCallDuration(0);
    setConnectionQuality("good");
  }, [stopRingtone]);

  // Format elapsed seconds to MM:SS
  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  // Start Call (Outgoing)
  const startCall = async (conversationId, calleeId, type) => {
    if (!user) return;

    try {
      // 1. Create call session record in DB
      const { data: callSession, error } = await supabase
        .from("calls")
        .insert({
          caller_id: user.id,
          receiver_id: calleeId,
          call_type: type === "voice" ? "audio" : "video",
          status: "ringing",
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Fetch callee details for calling screen
      const { data: calleeProfile } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .eq("id", calleeId)
        .single();

      setActiveCall({
        id: callSession.id,
        callee: calleeProfile,
        callerId: user.id,
        calleeId,
        type,
        status: "ringing",
        isIncoming: false,
        conversationId,
      });

      // Start ringing sound
      startRingtone(true);

      // Create incoming notification for the receiver
      await supabase
        .from("call_notifications")
        .insert({
          user_id: calleeId,
          call_id: callSession.id,
          type: "incoming",
        });

      // 3. Connect signaling channel for real-time events
      const callChannel = supabase.channel(`call:${callSession.id}`);
      signalingChannelRef.current = callChannel;

      callChannel
        .on("broadcast", { event: "call-accepted" }, async () => {
          stopRingtone();
          
          // Connect caller side to stream
          await connectToStream(callSession.id, type);
        })
        .on("broadcast", { event: "call-declined" }, async () => {
          cleanupCall();
        })
        .on("broadcast", { event: "call-ended" }, async () => {
          cleanupCall();
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            // Signal callee with offer
            const inviteChannel = supabase.channel(`call-signaling:${calleeId}`);
            inviteChannel.subscribe(async (subStatus) => {
              if (subStatus === "SUBSCRIBED") {
                await inviteChannel.send({
                  type: "broadcast",
                  event: "call-offer",
                  payload: { callId: callSession.id, conversationId, type },
                });
                setTimeout(() => {
                  inviteChannel.unsubscribe();
                }, 2000);
              }
            });
          }
        });

      // 4. Ringing Cadence Limit (Auto missed call after 45s)
      setTimeout(async () => {
        setActiveCall((curr) => {
          if (curr && curr.id === callSession.id && curr.status === "ringing") {
            // Ringing timed out, save missed call log
            handleMissedCall(conversationId, calleeId, type, callSession.id);
          }
          return curr;
        });
      }, 45000);

    } catch (err) {
      console.error("Start call error:", err);
      cleanupCall();
    }
  };

  // Handle missed call when timed out
  const handleMissedCall = async (conversationId, calleeId, type, callId) => {
    try {
      // 1. Update DB call status to missed
      await supabase
        .from("calls")
        .update({ status: "missed", ended_at: new Date().toISOString() })
        .eq("id", callId);

      // 2. Insert missed call notification
      await supabase
        .from("call_notifications")
        .insert({
          user_id: calleeId,
          call_id: callId,
          type: "missed",
        });

      // 3. Send cancelled broadcast to callee
      if (signalingChannelRef.current) {
        await signalingChannelRef.current.send({
          type: "broadcast",
          event: "call-declined",
          payload: {},
        });
      }

      // 4. Save call message log in conversation
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        type: "call",
        content: `Missed ${type === "video" ? "Video" : "Voice"} Call`,
        media_metadata: { call_id: callId, status: "missed", call_type: type },
      });

    } catch (err) {
      console.error("Handle missed call error:", err);
    } finally {
      cleanupCall();
    }
  };

  // Accept incoming call
  const acceptCall = async () => {
    if (!activeCall || !user) return;

    stopRingtone();

    try {
      // 1. Update database
      await supabase
        .from("calls")
        .update({ status: "accepted", started_at: new Date().toISOString() })
        .eq("id", activeCall.id);

      // 2. Signal caller of acceptance
      const callChannel = supabase.channel(`call:${activeCall.id}`);
      signalingChannelRef.current = callChannel;

      callChannel
        .on("broadcast", { event: "call-ended" }, () => {
          cleanupCall();
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await callChannel.send({
              type: "broadcast",
              event: "call-accepted",
              payload: {},
            });

            // Connect callee side to stream
            await connectToStream(activeCall.id, activeCall.type);
          }
        });

    } catch (err) {
      console.error("Accept call error:", err);
      cleanupCall();
    }
  };

  // Decline incoming call
  const declineCall = async () => {
    if (!activeCall) return;

    stopRingtone();

    try {
      await supabase
        .from("calls")
        .update({ status: "rejected", ended_at: new Date().toISOString() })
        .eq("id", activeCall.id);

      // Send decline signal
      const callChannel = supabase.channel(`call:${activeCall.id}`);
      callChannel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await callChannel.send({
            type: "broadcast",
            event: "call-declined",
            payload: {},
          });
          setTimeout(() => {
            callChannel.unsubscribe();
          }, 2000);
        }
      });

      // Write Declined Call log to conversation
      if (activeCall.conversationId) {
        await supabase.from("messages").insert({
          conversation_id: activeCall.conversationId,
          sender_id: user.id,
          type: "call",
          content: "Declined Call",
          media_metadata: { call_id: activeCall.id, status: "rejected", call_type: activeCall.type },
        });
      }

    } catch (err) {
      console.error("Decline call error:", err);
    } finally {
      cleanupCall();
    }
  };

  // End active call
  const endCall = async () => {
    if (!activeCall || !user) return;

    try {
      const endedAt = new Date().toISOString();
      const startedAt = activeCall.startedAt || endedAt;
      const elapsed = callDuration;

      // 1. Update database calls table
      await supabase
        .from("calls")
        .update({
          status: "ended",
          ended_at: endedAt,
          duration: elapsed,
        })
        .eq("id", activeCall.id);

      // 2. Broadcast call-ended to counterpart
      if (signalingChannelRef.current) {
        await signalingChannelRef.current.send({
          type: "broadcast",
          event: "call-ended",
          payload: {},
        });
      }

      // 3. Write call ended message to conversation
      if (activeCall.conversationId) {
        await supabase.from("messages").insert({
          conversation_id: activeCall.conversationId,
          sender_id: user.id,
          type: "call",
          content: `Call Ended (${formatDuration(elapsed)})`,
          media_metadata: { 
            call_id: activeCall.id, 
            status: "ended", 
            duration: elapsed, 
            call_type: activeCall.type 
          },
        });
      }

    } catch (err) {
      console.error("End call session error:", err);
    } finally {
      cleanupCall();
    }
  };

  // Main Stream setup (LiveKit connection with Simulator fallback)
  const connectToStream = async (callId, callType) => {
    if (connectingCallIdRef.current === callId) return;
    connectingCallIdRef.current = callId;

    try {
      // 1. Fetch token from server endpoint
      const identity = user.id;
      const displayName = user.email.split("@")[0];
      const res = await fetch(`/api/livekit/token?room=${callId}&identity=${identity}&name=${encodeURIComponent(displayName)}`);
      const data = await res.json();

      // Update activeCall status to active
      setActiveCall((prev) => prev ? { ...prev, status: "active", startedAt: new Date().toISOString() } : null);

      // Start duration timer
      timerIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      // Acquire User Camera/Microphone media stream locally
      let localStreamObj;
      try {
        const constraints = {
          audio: true,
          video: callType === "video" ? { facingMode } : false,
        };
        localStreamObj = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = localStreamObj;
        setLocalStream(localStreamObj);
      } catch (mediaErr) {
        console.warn("Failed to get local camera/mic stream, using audio-only or fallback", mediaErr);
      }

      if (data.isMock) {
        // Run Simulated Mode Fallback
        console.log("LiveKit server not configured. Starting simulated high-fidelity calling mode.");
        
        // Setup Canvas stream as remote video feed
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        let hue = 0;

        const drawCanvas = () => {
          if (!ctx) return;
          // Smooth abstract moving gradient
          const grad = ctx.createLinearGradient(0, 0, 640, 480);
          grad.addColorStop(0, `hsl(${hue}, 60%, 15%)`);
          grad.addColorStop(0.5, `hsl(${(hue + 80) % 360}, 50%, 10%)`);
          grad.addColorStop(1, `hsl(${(hue + 160) % 360}, 70%, 20%)`);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 640, 480);

          // Audio visualizer pulses in center
          ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(320, 240, 110 + Math.sin(hue * 0.04) * 25, 0, Math.PI * 2);
          ctx.stroke();

          // Animated particle waves
          ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
          for (let i = 0; i < 6; i++) {
            const x = 320 + Math.cos(hue * 0.015 + i) * 160;
            const y = 240 + Math.sin(hue * 0.01 + i) * 130;
            ctx.beginPath();
            ctx.arc(x, y, 40 + Math.sin(hue * 0.03 + i) * 15, 0, Math.PI * 2);
            ctx.fill();
          }

          // Small simulated call watermark
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
          ctx.font = "bold 12px sans-serif";
          ctx.fillText("SIMULATED HD CONNECTION", 24, 40);

          hue = (hue + 1) % 360;
          canvasAnimIdRef.current = requestAnimationFrame(drawCanvas);
        };
        drawCanvas();

        const simStream = canvas.captureStream(30);
        setRemoteStream(simStream);
        setConnectionQuality("good");
      } else {
        // Run Real LiveKit Mode
        const { Room, RoomEvent, ConnectionQuality } = await import("livekit-client");
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        roomRef.current = room;

        // Listen for remote track events
        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (track.kind === "video") {
            const mediaStream = new MediaStream([track.mediaStreamTrack]);
            setRemoteStream(mediaStream);
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          if (track.kind === "video") {
            setRemoteStream(null);
          }
        });

        room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
          if (participant === room.remoteParticipant) {
            if (quality === ConnectionQuality.Excellent || quality === ConnectionQuality.Good) {
              setConnectionQuality("good");
            } else if (quality === ConnectionQuality.Poor) {
              setConnectionQuality("poor");
            } else {
              setConnectionQuality("fair");
            }
          }
        });

        room.on(RoomEvent.Disconnected, () => {
          cleanupCall();
        });

        // Join Room
        await room.connect(data.serverUrl, data.token);

        // Publish local camera and mic tracks
        if (localStreamObj) {
          localStreamObj.getTracks().forEach((track) => {
            room.localParticipant.publishTrack(track);
          });
        }
      }

    } catch (err) {
      console.error("Setup call streams error:", err);
      // Fallback clean
      cleanupCall();
    }
  };

  // Toggle Microphone
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);

        // Update in LiveKit if active
        if (roomRef.current) {
          roomRef.current.localParticipant.setMicrophoneEnabled(audioTrack.enabled);
        }
      }
    }
  };

  // Toggle Video Camera
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);

        // Update in LiveKit if active
        if (roomRef.current) {
          roomRef.current.localParticipant.setCameraEnabled(videoTrack.enabled);
        }
      }
    }
  };

  // Screen Sharing
  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Turn off screen share, return to local camera
        if (roomRef.current) {
          await roomRef.current.localParticipant.setScreenShareEnabled(false);
        }
        
        // Re-acquire camera
        const constraints = {
          audio: true,
          video: activeCall?.type === "video" ? { facingMode } : false,
        };
        const cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(t => t.stop());
        }
        localStreamRef.current = cameraStream;
        setLocalStream(cameraStream);
        setIsScreenSharing(false);
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        
        if (roomRef.current) {
          const track = screenStream.getVideoTracks()[0];
          await roomRef.current.localParticipant.publishTrack(track);
        }
        
        // Update local preview to screen
        if (localStreamRef.current) {
          // Keep audio track from current stream if available
          const audioTrack = localStreamRef.current.getAudioTracks()[0];
          if (audioTrack) {
            screenStream.addTrack(audioTrack);
          }
        }
        
        localStreamRef.current = screenStream;
        setLocalStream(screenStream);
        setIsScreenSharing(true);

        // Stop sharing handler on browser bar click
        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare(); // revert
        };
      }
    } catch (err) {
      console.error("Screen share toggle error:", err);
    }
  };

  // Switch camera/video inputs
  const switchCamera = async () => {
    if (!localStreamRef.current || activeCall?.type !== "video") return;
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacingMode);

    try {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) videoTrack.stop();

      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: newFacingMode },
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (audioTrack) {
        localStreamRef.current.removeTrack(videoTrack);
        localStreamRef.current.addTrack(newVideoTrack);
      } else {
        localStreamRef.current = newStream;
      }
      
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

      if (roomRef.current && newVideoTrack) {
        // Switch track in LiveKit
        const senders = roomRef.current.localParticipant.getTrackPublications();
        // Replace video publisher
        roomRef.current.localParticipant.setCameraEnabled(false);
        setTimeout(() => {
          roomRef.current.localParticipant.setCameraEnabled(true);
        }, 300);
      }
    } catch (err) {
      console.error("Switch camera error:", err);
    }
  };

  // Dynamically switch to selected hardware device
  const switchDevice = async (kind, deviceId) => {
    if (kind === "audioinput") {
      setSelectedAudioDevice(deviceId);
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) audioTrack.stop();
        
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } },
          video: false,
        });
        const newAudioTrack = newStream.getAudioTracks()[0];
        localStreamRef.current.addTrack(newAudioTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
    } else if (kind === "videoinput") {
      setSelectedVideoDevice(deviceId);
      if (localStreamRef.current && activeCall?.type === "video") {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) videoTrack.stop();
        
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { deviceId: { exact: deviceId } },
        });
        const newVideoTrack = newStream.getVideoTracks()[0];
        localStreamRef.current.addTrack(newVideoTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
    }
  };

  // Setup devices listener
  useEffect(() => {
    updateDeviceList();
    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener("devicechange", updateDeviceList);
      return () => {
        navigator.mediaDevices.removeEventListener("devicechange", updateDeviceList);
      };
    }
  }, [updateDeviceList]);

  // Listen for incoming call events via Supabase Realtime (Broadcast + Postgres INSERT changes fallback)
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`call-signaling:${user.id}`);

    channel
      .on("broadcast", { event: "call-offer" }, async ({ payload }) => {
        // Query the calls table to verify the status is still ringing
        const { data: callData } = await supabase
          .from("calls")
          .select("*, caller:profiles!caller_id(id, display_name, username, avatar_url)")
          .eq("id", payload.callId)
          .single();

        if (callData && callData.status === "ringing") {
          setActiveCall((curr) => {
            if (curr && curr.id === callData.id) return curr;
            if (curr && curr.status !== "ended" && curr.status !== "rejected" && curr.status !== "missed") {
              return curr;
            }

            // Play incoming electronic ring
            startRingtone(false);

            return {
              id: callData.id,
              caller: callData.caller,
              callerId: callData.caller_id,
              calleeId: callData.receiver_id,
              type: callData.call_type === "audio" ? "voice" : "video",
              status: "ringing",
              isIncoming: true,
              conversationId: payload.conversationId,
            };
          });
        }
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "calls",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const newCall = payload.new;
          if (newCall && newCall.status === "ringing") {
            setActiveCall((curr) => {
              if (curr && curr.id === newCall.id) return curr;
              if (curr && curr.status !== "ended" && curr.status !== "rejected" && curr.status !== "missed") {
                return curr;
              }

              // Fetch details asynchronously
              (async () => {
                try {
                  const [callerRes, convId] = await Promise.all([
                    supabase
                      .from("profiles")
                      .select("id, display_name, username, avatar_url")
                      .eq("id", newCall.caller_id)
                      .single(),
                    (async () => {
                      // Find existing direct conversation ID
                      const { data: memberData } = await supabase
                        .from("conversation_members")
                        .select("conversation_id")
                        .eq("user_id", newCall.caller_id);

                      const callerConvIds = (memberData || []).map((m) => m.conversation_id);

                      if (callerConvIds.length > 0) {
                        const { data: calleeMemberData } = await supabase
                          .from("conversation_members")
                          .select("conversation_id")
                          .eq("user_id", user.id)
                          .in("conversation_id", callerConvIds);

                        if (calleeMemberData && calleeMemberData.length > 0) {
                          return calleeMemberData[0].conversation_id;
                        }
                      }
                      return null;
                    })(),
                  ]);

                  const callerData = callerRes.data;

                  setActiveCall((latest) => {
                    if (latest && latest.id === newCall.id) return latest;
                    if (latest && latest.status !== "ended" && latest.status !== "rejected" && latest.status !== "missed") {
                      return latest;
                    }

                    // Play incoming electronic ring
                    startRingtone(false);

                    return {
                      id: newCall.id,
                      caller: callerData,
                      callerId: newCall.caller_id,
                      calleeId: newCall.receiver_id,
                      type: newCall.call_type === "audio" ? "voice" : "video",
                      status: "ringing",
                      isIncoming: true,
                      conversationId: convId,
                    };
                  });
                } catch (err) {
                  console.error("Error setting up incoming call from postgres insert:", err);
                }
              })();

              return curr;
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, startRingtone]);

  // Listen for updates to the active call status in the database (e.g. accepted, rejected, ended)
  useEffect(() => {
    if (!user || !activeCall?.id) return;

    const callId = activeCall.id;
    const channel = supabase.channel(`active-call-db:${callId}`);

    channel
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `id=eq.${callId}`,
        },
        async (payload) => {
          const updatedCall = payload.new;
          if (!updatedCall) return;

          console.log("Active call Postgres update:", updatedCall.status, updatedCall);
          const currentCall = activeCallRef.current;
          if (!currentCall || currentCall.id !== callId) return;

          if (updatedCall.status === "accepted" && currentCall.status === "ringing") {
            // Callee accepted the call
            if (!currentCall.isIncoming) {
              stopRingtone();
              await connectToStream(callId, currentCall.type);
            }
          } else if (
            updatedCall.status === "rejected" ||
            updatedCall.status === "ended" ||
            updatedCall.status === "missed"
          ) {
            // Call was ended, rejected, or missed by either party
            cleanupCall();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, activeCall?.id, stopRingtone, cleanupCall]);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        localStream,
        remoteStream,
        startCall,
        acceptCall,
        declineCall,
        endCall,
        switchCamera,
        toggleMute,
        toggleVideo,
        toggleScreenShare,
        isMuted,
        isVideoEnabled,
        isScreenSharing,
        isFullscreen,
        setIsFullscreen,
        callDuration,
        connectionQuality,
        audioDevices,
        videoDevices,
        selectedAudioDevice,
        selectedVideoDevice,
        switchDevice,
      }}
    >
      {children}
      {/* Display call screen modal if activeCall is set */}
      {activeCall && (
        <CallModal
          call={activeCall}
          localStream={localStream}
          remoteStream={remoteStream}
          onAccept={acceptCall}
          onDecline={declineCall}
          onHangup={endCall}
          isMuted={isMuted}
          isVideoEnabled={isVideoEnabled}
          isScreenSharing={isScreenSharing}
          isFullscreen={isFullscreen}
          setIsFullscreen={setIsFullscreen}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          onSwitchCamera={switchCamera}
          hasCameraSwitch={hasCameraSwitch}
          callDuration={callDuration}
          connectionQuality={connectionQuality}
          audioDevices={audioDevices}
          videoDevices={videoDevices}
          selectedAudioDevice={selectedAudioDevice}
          selectedVideoDevice={selectedVideoDevice}
          onSwitchDevice={switchDevice}
        />
      )}
    </CallContext.Provider>
  );
}

export const useCall = () => useContext(CallContext);

// --- CALL SCREEN MODAL OVERLAY COMPONENT ---
function CallModal({
  call,
  localStream,
  remoteStream,
  onAccept,
  onDecline,
  onHangup,
  isMuted,
  isVideoEnabled,
  isScreenSharing,
  isFullscreen,
  setIsFullscreen,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onSwitchCamera,
  hasCameraSwitch,
  callDuration,
  connectionQuality,
  audioDevices,
  videoDevices,
  selectedAudioDevice,
  selectedVideoDevice,
  onSwitchDevice,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const modalContainerRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      modalContainerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((e) => console.log("Error enabling fullscreen:", e));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  const name = call.isIncoming ? call.caller?.display_name : call.callee?.display_name;
  const username = call.isIncoming ? call.caller?.username : call.callee?.username;
  const avatar = call.isIncoming ? call.caller?.avatar_url : call.callee?.avatar_url;

  return (
    <div 
      ref={modalContainerRef}
      id="call-modal-container"
      className="fixed inset-0 z-[100] bg-zinc-950 text-white flex flex-col justify-between font-sans select-none overflow-hidden"
    >
      
      {/* 1. Header (Info & Timer & Quality) */}
      <header className="p-6 md:p-8 flex items-center justify-between w-full z-30 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 shadow-md">
            <img
              src={avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=fff&color=1A1A1A`}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="font-serif font-black text-lg tracking-tight uppercase leading-tight">{name}</h2>
            <p className="font-mono text-[10px] text-white/50 tracking-wider">@{username}</p>
          </div>
        </div>

        {/* Timer and Quality Indicator */}
        <div className="flex items-center gap-4">
          {call.status === "active" && (
            <div className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full font-mono text-xs tracking-widest text-primary-container">
              {formatDuration(callDuration)}
            </div>
          )}
          
          {call.status === "active" && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full">
              <Wifi 
                size={14} 
                className={`${
                  connectionQuality === "good" 
                    ? "text-emerald-400 animate-pulse" 
                    : connectionQuality === "fair" 
                    ? "text-amber-400" 
                    : "text-rose-500 animate-ping"
                }`} 
              />
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/70">
                {connectionQuality}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* 2. Primary Screens Area */}
      <main className="flex-1 w-full relative flex items-center justify-center">
        
        {/* Ringing / Calling Cover State */}
        {call.status === "ringing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-zinc-950/70 p-6">
            <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl relative flex items-center justify-center">
              <img
                src={avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=fff&color=1A1A1A`}
                alt=""
                className="w-full h-full object-cover"
              />
              {/* Pulsing ring animation */}
              <div className="absolute inset-0 border-2 border-white rounded-full animate-ping opacity-40"></div>
            </div>
            <div className="text-center mt-6 space-y-2">
              <h1 className="font-serif font-black text-2xl uppercase tracking-wider">{name}</h1>
              <p className="text-sm font-light text-white/60 uppercase tracking-[0.25em] animate-pulse">
                {call.isIncoming ? "Incoming Audio/Video Call..." : "Ringing..."}
              </p>
            </div>
          </div>
        )}

        {/* Video Calling Screen Layout */}
        {call.type === "video" && call.status === "active" && (
          <div className="absolute inset-0 w-full h-full bg-zinc-900">
            {/* Fullscreen Remote Video Feed */}
            {remoteStream ? (
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white/40 gap-3">
                <Loader2 className="animate-spin text-white/50" size={28} />
                <span className="text-xs uppercase tracking-widest">Connecting video stream...</span>
              </div>
            )}

            {/* Draggable/PIP Floating Self Preview Screen */}
            <div className="absolute bottom-24 right-6 w-28 h-36 md:w-36 md:h-48 rounded-xl border border-white/20 shadow-2xl overflow-hidden bg-zinc-950 z-20 transition-all flex items-center justify-center">
              {localStream && isVideoEnabled ? (
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover scale-x-[-1]" 
                />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-center p-2 text-white/40">
                  <VideoOff size={16} />
                  <span className="text-[9px] uppercase font-bold tracking-widest leading-none">Video Off</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voice Calling Active Layout */}
        {call.type === "voice" && call.status === "active" && (
          <div className="flex flex-col items-center justify-center space-y-8 p-6">
            <div className="w-24 h-24 rounded-full overflow-hidden border border-white/10 shadow-2xl relative">
              <img
                src={avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=fff&color=1A1A1A`}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Pulsing Audio waveform visualization */}
            <div className="flex items-center gap-2.5 h-16">
              {[1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1].map((_, idx) => (
                <div
                  key={idx}
                  className="w-1 bg-white/40 rounded-full animate-bounce"
                  style={{ 
                    height: `${24 + Math.sin(idx) * 20}px`,
                    animationDelay: `${idx * 0.08}s`,
                    animationDuration: '1.2s'
                  }}
                />
              ))}
            </div>

            <p className="text-xs uppercase tracking-[0.2em] font-medium text-white/50 animate-pulse">
              Voice Call Connected
            </p>
          </div>
        )}
      </main>

      {/* 3. Hardware Settings Panel Overlay */}
      {showSettings && (
        <div className="absolute inset-x-4 bottom-24 bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-6 rounded-2xl z-40 max-w-md mx-auto animate-fade-in text-left space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/10">
            <h4 className="font-bold text-sm uppercase tracking-wider text-white">Device Selection</h4>
            <button 
              onClick={() => setShowSettings(false)}
              className="text-white/60 hover:text-white text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
              Close
            </button>
          </div>
          
          {/* Microphones select */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-white/50 tracking-widest block">Microphone</label>
            <select
              value={selectedAudioDevice}
              onChange={(e) => onSwitchDevice("audioinput", e.target.value)}
              className="w-full bg-zinc-800 text-white text-xs p-2.5 rounded-lg outline-none border border-white/5 focus:border-white/30"
            >
              {audioDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>

          {/* Cameras select */}
          {call.type === "video" && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-white/50 tracking-widest block">Camera</label>
              <select
                value={selectedVideoDevice}
                onChange={(e) => onSwitchDevice("videoinput", e.target.value)}
                className="w-full bg-zinc-800 text-white text-xs p-2.5 rounded-lg outline-none border border-white/5 focus:border-white/30"
              >
                {videoDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* 4. Controls Footer */}
      <footer className="p-6 md:p-8 flex flex-col items-center gap-4 z-30 bg-gradient-to-t from-black/80 to-transparent">
        
        {/* Ringing Controls */}
        {call.status === "ringing" ? (
          call.isIncoming ? (
            /* Incoming accepts / rejects */
            <div className="flex gap-8 justify-center w-full max-w-xs">
              <button
                onClick={onDecline}
                className="w-16 h-16 bg-rose-600 hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all text-white rounded-full flex items-center justify-center cursor-pointer shadow-xl"
                title="Decline Call"
              >
                <PhoneOff size={24} />
              </button>
              <button
                onClick={onAccept}
                className="w-16 h-16 bg-emerald-600 hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all text-white rounded-full flex items-center justify-center cursor-pointer shadow-xl"
                title="Accept Call"
              >
                {call.type === "video" ? <Video size={24} /> : <Phone size={24} />}
              </button>
            </div>
          ) : (
            /* Outgoing cancel hangup */
            <button
              onClick={onHangup}
              className="w-16 h-16 bg-rose-600 hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all text-white rounded-full flex items-center justify-center cursor-pointer shadow-xl"
              title="Cancel Ringing"
            >
              <PhoneOff size={24} />
            </button>
          )
        ) : (
          /* Active Call Controls Panel */
          <div className="flex items-center gap-4 md:gap-6 bg-white/10 backdrop-blur-md border border-white/10 px-6 py-4 rounded-full shadow-2xl transition-all">
            
            {/* Toggle Mic Mute */}
            <button
              onClick={onToggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                isMuted
                  ? "bg-rose-500 text-white border-rose-500 hover:bg-rose-600"
                  : "bg-white/10 border-white/10 hover:bg-white/20 text-white"
              }`}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* Toggle Video Camera */}
            {call.type === "video" && (
              <button
                onClick={onToggleVideo}
                className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                  !isVideoEnabled
                    ? "bg-rose-500 text-white border-rose-500 hover:bg-rose-600"
                    : "bg-white/10 border-white/10 hover:bg-white/20 text-white"
                }`}
                title={isVideoEnabled ? "Turn Camera Off" : "Turn Camera On"}
              >
                {!isVideoEnabled ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
            )}

            {/* End Call Button */}
            <button
              onClick={onHangup}
              className="w-14 h-14 bg-rose-600 hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg"
              title="End Call"
            >
              <PhoneOff size={22} />
            </button>

            {/* Screen Share Button */}
            {call.type === "video" && (
              <button
                onClick={onToggleScreenShare}
                className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                  isScreenSharing
                    ? "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600"
                    : "bg-white/10 border-white/10 hover:bg-white/20 text-white"
                }`}
                title={isScreenSharing ? "Stop Screen Sharing" : "Share Screen"}
              >
                <Share2 size={20} />
              </button>
            )}

            {/* Flip Camera Button (mobile specific) */}
            {call.type === "video" && hasCameraSwitch && (
              <button
                onClick={onSwitchCamera}
                className="w-12 h-12 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 text-white active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                title="Switch Camera Facing"
              >
                <RotateCw size={20} />
              </button>
            )}

            {/* Settings toggler */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                showSettings
                  ? "bg-white text-zinc-900 border-white hover:bg-white/95"
                  : "bg-white/10 border-white/10 hover:bg-white/20 text-white"
              }`}
              title="Device Settings"
            >
              <Settings size={20} />
            </button>

            {/* Fullscreen toggler */}
            <button
              onClick={handleFullscreenToggle}
              className="w-12 h-12 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 text-white active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              title="Toggle Fullscreen Mode"
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>

          </div>
        )}
      </footer>
    </div>
  );
}
