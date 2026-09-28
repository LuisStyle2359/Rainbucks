"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { SendIcon } from "@/components/casino/ui/icons";
import { audio } from "@/lib/audio/audio-engine";
import { cn } from "@/lib/cn";
import { getSocket } from "@/lib/realtime/simulated-socket";
import { useLiveStore } from "@/lib/stores/live-store";

const MAX_LENGTH = 160;
const COOLDOWN_MS = 1_000;

export function Chat() {
  const messages = useLiveStore((s) => s.messages);
  const me = useLiveStore((s) => s.me);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const lastSent = useRef(0);

  // Automatisch mitscrollen, außer der Nutzer liest gerade weiter oben
  useEffect(() => {
    const list = listRef.current;
    if (list && stickToBottom.current) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const send = () => {
    const trimmed = text.trim().slice(0, MAX_LENGTH);
    const now = performance.now();
    if (!trimmed || !me || now - lastSent.current < COOLDOWN_MS) return;
    lastSent.current = now;
    getSocket().emit("chat:send", { user: me, text: trimmed });
    stickToBottom.current = true;
    setText("");
    audio.play("click", { pitch: 1.4 });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={listRef}
        onScroll={(event) => {
          const el = event.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        className="scrollbar-none min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3"
        aria-live="polite"
      >
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "rounded-xl px-3 py-2 text-sm",
              message.user.isYou ? "border border-toxic/20 bg-toxic/[0.06]" : "bg-white/[0.03]",
            )}
          >
            <div className="mb-0.5 flex items-center gap-2">
              <span
                className="grid size-5 shrink-0 place-items-center rounded-md font-display text-[10px] font-bold text-black"
                style={{ backgroundColor: message.user.color }}
              >
                {message.user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="truncate text-xs font-semibold" style={{ color: message.user.color }}>
                {message.user.name}
              </span>
              <span className="rounded bg-white/[0.06] px-1 font-mono text-[9px] text-zinc-500">
                {message.user.isYou ? "DU" : `LV ${message.user.level}`}
              </span>
            </div>
            <p className="break-words text-zinc-300">{message.text}</p>
          </motion.div>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
        className="flex gap-2 border-t border-white/[0.06] p-3"
      >
        <input
          value={text}
          maxLength={MAX_LENGTH}
          onChange={(event) => setText(event.target.value)}
          placeholder="Nachricht schreiben …"
          aria-label="Chat-Nachricht"
          className="h-10 min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-black/50 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-toxic/60"
        />
        <button
          type="submit"
          aria-label="Senden"
          disabled={!text.trim()}
          className="grid size-10 place-items-center rounded-lg bg-toxic text-black shadow-glow-toxic transition disabled:opacity-30 disabled:shadow-none"
        >
          <SendIcon className="size-4" />
        </button>
      </form>
    </div>
  );
}
