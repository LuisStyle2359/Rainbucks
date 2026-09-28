import { create } from "zustand";
import type { ChatMessage, ChatUser, LiveBet } from "@/lib/realtime/types";

const MESSAGE_LIMIT = 60;
const FEED_LIMIT = 30;

interface LiveState {
  me: ChatUser | null;
  connected: boolean;
  online: number;
  messages: ChatMessage[];
  feed: LiveBet[];
  setMe: (me: ChatUser) => void;
  setConnected: (connected: boolean) => void;
  setOnline: (online: number) => void;
  addMessage: (message: ChatMessage) => void;
  addBet: (bet: LiveBet) => void;
}

export const useLiveStore = create<LiveState>()((set) => ({
  me: null,
  connected: false,
  online: 0,
  messages: [],
  feed: [],
  setMe: (me) => set({ me }),
  setConnected: (connected) => set({ connected }),
  setOnline: (online) => set({ online }),
  addMessage: (message) =>
    set((state) =>
      state.messages.some((m) => m.id === message.id)
        ? state
        : { messages: [...state.messages, message].slice(-MESSAGE_LIMIT) },
    ),
  addBet: (bet) => set((state) => ({ feed: [bet, ...state.feed].slice(0, FEED_LIMIT) })),
}));
