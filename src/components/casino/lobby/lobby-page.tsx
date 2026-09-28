"use client";

import NextLink from "next/link";
import { GAMES } from "@/lib/casino/games";
import { Lobby } from "./lobby";

/** Lobby mit Next.js-Links (Client-Navigation ohne Neuladen). */
export function LobbyPage() {
  return <Lobby Link={NextLink} hrefFor={(target) => (target === "fairness" ? "/casino/fairness" : GAMES[target].href)} />;
}
