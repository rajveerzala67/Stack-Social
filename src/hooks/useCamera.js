"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const [isActive, setIsActive] = useState(false);
  const [facingMode, setFacingMode] = useState("environment"); // 'user' (front) or 'environment' (back)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [error, setError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  // Check how many cameras the device has
  useEffect(() => {
    const checkCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoDevices.length > 1);
      } catch {
        setHasMultipleCameras(false);
      }
    };
    checkCameras();
  }, []);

  // Start camera stream (includes audio track if mode is video for recording)
  const startCamera = useCallback(async (mode, includeAudio = false) => {
    try {
      // Stop existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints = {
        video: {
          facingMode: mode || facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1350 },
        },
        audio: includeAudio, // Enable audio recording for story/reels video modes
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setIsActive(true);
      setError(null);
    } catch (err) {
      console.error("Camera error:", err);
      setError(err.message);
      setIsActive(false);
    }
  }, [facingMode]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  // Switch between front/back camera
  const switchCamera = useCallback(async () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    if (isActive) {
      await startCamera(newMode, isRecording);
    }
  }, [facingMode, isActive, startCamera, isRecording]);

  // Toggle flash/torch
  const toggleTorch = useCallback(async (enable) => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: enable }],
        });
      } catch {
        console.warn("Torch not supported on this device");
      }
    }
  }, []);

  // Capture a frame from the video
  const captureFrame = useCallback(() => {
    if (!videoRef.current) return null;

    const canvas = canvasRef.current || document.createElement("canvas");
    const video = videoRef.current;
    
    // Fallback if metadata not fully loaded yet
    const width = video.videoWidth || video.offsetWidth || 1080;
    const height = video.videoHeight || video.offsetHeight || 1350;
    
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedImage(dataUrl);

    // Convert to blob for uploading
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            blob.name = `capture-${Date.now()}.jpg`;
          }
          resolve(blob);
        },
        "image/jpeg",
        0.92
      );
    });
  }, []);

  // Start video recording
  const startRecording = useCallback(async () => {
    // If audio is disabled, restart camera stream to request microphone permission for video
    if (!streamRef.current?.getAudioTracks().length) {
      await startCamera(facingMode, true);
    }

    if (!streamRef.current) return;
    recordedChunksRef.current = [];

    let options = { mimeType: "video/webm;codecs=vp9,opus" };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: "video/webm;codecs=vp8,opus" };
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: "video/webm" };
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: "video/mp4" };
    }

    try {
      const recorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start media recording:", err);
    }
  }, [facingMode, startCamera]);

  // Stop video recording
  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: mediaRecorderRef.current.mimeType || "video/webm",
        });
        blob.name = `video-${Date.now()}.${mediaRecorderRef.current.mimeType?.includes("mp4") ? "mp4" : "webm"}`;
        setIsRecording(false);
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    isActive,
    error,
    hasMultipleCameras,
    facingMode,
    capturedImage,
    isRecording,
    startCamera,
    stopCamera,
    switchCamera,
    toggleTorch,
    captureFrame,
    setCapturedImage,
    startRecording,
    stopRecording,
  };
}
