import type { Metadata } from "next";
import { CrashGame } from "@/components/games/crash/crash-game";
import { GameHeader } from "@/components/games/game-header";

export const metadata: Metadata = { title: "Crash" };

export default function CrashPage() {
  return (
    <>
      <GameHeader game="crash" />
      <CrashGame />
    </>
  );
}
