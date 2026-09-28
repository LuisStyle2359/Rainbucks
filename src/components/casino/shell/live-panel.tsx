"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { CloseIcon } from "@/components/casino/ui/icons";
import { Segmented } from "@/components/casino/ui/segmented";
import { useLiveStore } from "@/lib/stores/live-store";
import { useSettingsStore, useUiStore } from "@/lib/stores/settings-store";
import { Chat } from "./chat";
import { LiveFeed } from "./live-feed";

type Tab = "chat" | "bets";
const TABS = [
  { value: "chat", label: "Chat" },
  { value: "bets", label: "Live bets" },
] as const satisfies readonly { value: Tab; label: string }[];

function PanelContent({ layoutId, onClose }: { layoutId: string; onClose?: () => void }) {
  const [tab, setTab] = useState<Tab>("chat");
  const online = useLiveStore((s) => s.online);
  const connected = useLiveStore((s) => s.connected);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-white/[0.06] p-3">
        <Segmented options={TABS} value={tab} onChange={setTab} layoutId={layoutId} size="sm" className="flex-1" />
        {onClose && (
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="glass grid size-9 place-items-center rounded-lg text-zinc-300 hover:text-white"
          >
            <CloseIcon className="size-4" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 px-4 py-2 text-[11px] text-zinc-500">
        <span className={connected ? "size-1.5 rounded-full bg-toxic shadow-[0_0_8px_#39ff14]" : "size-1.5 rounded-full bg-zinc-600"} />
        {connected ? `${online.toLocaleString("en-US")} players online` : "Connecting …"}
        <span className="ml-auto rounded bg-white/[0.05] px-1.5 py-0.5 text-[9px] uppercase tracking-widest">simulated</span>
      </div>
      {tab === "chat" ? <Chat /> : <LiveFeed />}
    </div>
  );
}

/** Fixed sidebar from 1280px width. */
export function LivePanel() {
  const open = useSettingsStore((s) => s.livePanelOpen);
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          key="live-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 40 }}
          className="sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 overflow-hidden border-l border-white/[0.06] xl:block"
          aria-label="Live chat and bets"
        >
          <div className="h-full w-80">
            <PanelContent layoutId="live-tab-desktop" />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/** Drawer for phones and tablets. */
export function LiveDrawer() {
  const open = useUiStore((s) => s.mobileLiveOpen);
  const close = () => useUiStore.getState().setMobileLiveOpen(false);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] xl:hidden">
          <motion.button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            role="dialog"
            aria-label="Live chat and bets"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 42 }}
            className="glass-strong absolute inset-y-0 right-0 w-[88vw] max-w-sm border-y-0 border-r-0 pb-[env(safe-area-inset-bottom)]"
          >
            <PanelContent layoutId="live-tab-mobile" onClose={close} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
