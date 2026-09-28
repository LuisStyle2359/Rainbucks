"use client";

import { useEffect } from "react";
import type { GameId } from "@/lib/casino/games";
import { useUiStore } from "@/lib/stores/settings-store";

/** Merkt sich im globalen Store, welches Spiel gerade offen ist. */
export function useActiveGame(game: GameId): void {
  useEffect(() => {
    useUiStore.getState().setActiveGame(game);
    return () => useUiStore.getState().setActiveGame(null);
  }, [game]);
}
