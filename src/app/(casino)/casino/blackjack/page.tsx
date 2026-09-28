import type { Metadata } from "next";
import { BlackjackGameView } from "@/components/games/blackjack/blackjack-game";
import { GameHeader } from "@/components/games/game-header";

export const metadata: Metadata = { title: "Blackjack" };

export default function BlackjackPage() {
  return (
    <>
      <GameHeader game="blackjack" />
      <BlackjackGameView />
    </>
  );
}
