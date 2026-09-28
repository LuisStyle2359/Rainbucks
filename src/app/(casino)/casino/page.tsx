import type { Metadata } from "next";
import { Lobby } from "@/components/casino/lobby/lobby";

export const metadata: Metadata = { title: "Lobby" };

export default function LobbyPage() {
  return <Lobby />;
}
