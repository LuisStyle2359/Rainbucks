import type { Metadata } from "next";
import { GameHeader } from "@/components/games/game-header";
import { MinesGameView } from "@/components/games/mines/mines-game";

export const metadata: Metadata = { title: "Mines" };

export default function MinesPage() {
  return (
    <>
      <GameHeader game="mines" />
      <MinesGameView />
    </>
  );
}
