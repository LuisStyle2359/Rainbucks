import { GAME_ICONS } from "@/components/casino/ui/icons";
import { GAMES, type GameId } from "@/lib/casino/games";

export function GameHeader({ game }: { game: GameId }) {
  const info = GAMES[game];
  const Icon = GAME_ICONS[game];
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-xl bg-toxic/10 text-toxic ring-1 ring-toxic/30 shadow-[0_0_24px_-6px_rgb(57_255_20/0.7)]">
        <Icon className="size-5" />
      </span>
      <div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-wider text-white">{info.name}</h1>
        <p className="text-sm text-zinc-500">{info.tagline}</p>
      </div>
    </div>
  );
}
