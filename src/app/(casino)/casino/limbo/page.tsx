import type { Metadata } from "next";
import { GameHeader } from "@/components/games/game-header";
import { LimboGame } from "@/components/games/limbo/limbo-game";

export const metadata: Metadata = { title: "Limbo" };

export default function LimboPage() {
  return (
    <>
      <GameHeader game="limbo" />
      <LimboGame />
    </>
  );
}
