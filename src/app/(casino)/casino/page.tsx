import type { Metadata } from "next";
import { LobbyPage as LobbyView } from "@/components/casino/lobby/lobby-page";

export const metadata: Metadata = { title: "Lobby" };

export default function LobbyPage() {
  return <LobbyView />;
}
