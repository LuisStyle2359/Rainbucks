import type { Metadata } from "next";
import { GameHeader } from "@/components/games/game-header";
import { PlinkoGame } from "@/components/games/plinko/plinko-game";

export const metadata: Metadata = { title: "Plinko" };

export default function PlinkoPage() {
  return (
    <>
      <GameHeader game="plinko" />
      <PlinkoGame />
    </>
  );
}
