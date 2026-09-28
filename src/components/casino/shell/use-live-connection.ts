"use client";

import { useEffect } from "react";
import { colorFor } from "@/lib/realtime/bots";
import { getSocket } from "@/lib/realtime/simulated-socket";
import { useLiveStore } from "@/lib/stores/live-store";

/** Verbindet den (simulierten) Socket und schreibt eingehende Events in den Live-Store. */
export function useLiveConnection(name: string): void {
  useEffect(() => {
    const live = useLiveStore.getState();
    live.setMe({ name, color: colorFor(name), level: 1, isYou: true });

    const socket = getSocket();
    const unsubscribe = [
      socket.on("chat:message", (message) => useLiveStore.getState().addMessage(message)),
      socket.on("bets:new", (bet) => useLiveStore.getState().addBet(bet)),
      socket.on("presence:update", ({ online }) => useLiveStore.getState().setOnline(online)),
    ];
    socket.connect();
    live.setConnected(true);

    return () => {
      for (const off of unsubscribe) off();
      socket.disconnect();
      useLiveStore.getState().setConnected(false);
    };
  }, [name]);
}
