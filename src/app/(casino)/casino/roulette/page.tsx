import type { Metadata } from "next";
import { GameHeader } from "@/components/games/game-header";
import { RouletteGame } from "@/components/games/roulette/roulette-game";

export const metadata: Metadata = { title: "Roulette" };

export default function RoulettePage() {
  return (
    <>
      <GameHeader game="roulette" />
      <RouletteGame />
    </>
  );
}
