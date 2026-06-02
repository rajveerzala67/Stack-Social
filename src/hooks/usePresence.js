"use client";

import { useAuth } from "@/context/AuthContext";

export function usePresence() {
  const { onlineUsers, isOnline } = useAuth();
  return { onlineUsers, isOnline };
}
