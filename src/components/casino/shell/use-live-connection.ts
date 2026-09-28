"use client";

import { useEffect } from "react";
import { levelFromXp, xpFromWagered } from "@/lib/casino/levels";
import { colorFor } from "@/lib/realtime/bots";
import { getSocket } from "@/lib/realtime/simulated-socket";
import { useLiveStore } from "@/lib/stores/live-store";
import { useWalletStore } from "@/lib/stores/wallet-store";

const currentLevel = (wagered: number) => levelFromXp(xpFromWagered(wagered)).level;

/** Connects the (simulated) socket and writes incoming events into the live store. */
export function useLiveConnection(name: string): void {
  useEffect(() => {
    const live = useLiveStore.getState();
    live.setMe({ name, color: colorFor(name), level: currentLevel(useWalletStore.getState().stats.wagered), isYou: true });

    // Your VIP level shows up in chat and in the live feed
    const offLevel = useWalletStore.subscribe((state, previous) => {
      if (state.stats.wagered === previous.stats.wagered) return;
      const level = currentLevel(state.stats.wagered);
      const me = useLiveStore.getState().me;
      if (me && me.level !== level) useLiveStore.getState().setMe({ ...me, level });
    });

    const socket = getSocket();
    const unsubscribe = [
      socket.on("chat:message", (message) => useLiveStore.getState().addMessage(message)),
      socket.on("bets:new", (bet) => useLiveStore.getState().addBet(bet)),
      socket.on("presence:update", ({ online }) => useLiveStore.getState().setOnline(online)),
    ];
    socket.connect();
    live.setConnected(true);

    return () => {
      offLevel();
      for (const off of unsubscribe) off();
      socket.disconnect();
      useLiveStore.getState().setConnected(false);
    };
  }, [name]);
}
