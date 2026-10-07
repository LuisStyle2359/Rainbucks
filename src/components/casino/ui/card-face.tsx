import { cn } from "@/lib/cn";
import { cardRank, cardSuit } from "@/lib/games/blackjack/blackjack-game";

const RANK_LABELS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUIT_GLYPHS = ["♠", "♥", "♦", "♣"];

/** Card corner radius relative to the card size, so every size looks the same. */
const CARD_RADIUS = "rounded-[9%/6.5%]";

/**
 * Face of a playing card. Sizes come from the parent (any width, 5:7),
 * the typography scales with the card through container query units.
 */
export function CardFace({ card, className }: { card: number; className?: string }) {
  const rankIndex = cardRank(card);
  const rank = RANK_LABELS[rankIndex];
  const suit = SUIT_GLYPHS[cardSuit(card)];
  const red = cardSuit(card) === 1 || cardSuit(card) === 2;
  const court = rankIndex >= 10;

  return (
    <div
      className={cn(
        "@container absolute inset-0 overflow-hidden border border-black/10 bg-[linear-gradient(160deg,#ffffff,#eef0f4_55%,#d8dbe2)] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.8),0_8px_18px_-8px_rgb(0_0_0/0.9)] [backface-visibility:hidden]",
        CARD_RADIUS,
        red ? "text-[#e0193f]" : "text-zinc-900",
        className,
      )}
    >
      <Corner rank={rank} suit={suit} className="left-[7%] top-[5%]" />
      <Corner rank={rank} suit={suit} className="bottom-[5%] right-[7%] rotate-180" />

      {court ? (
        <div
          className={cn(
            "absolute inset-x-[22%] inset-y-[20%] flex flex-col items-center justify-center rounded-[8%] border",
            red
              ? "border-[#e0193f]/30 bg-[linear-gradient(160deg,#ffe4ea,#ffc7d3)]"
              : "border-zinc-900/20 bg-[linear-gradient(160deg,#eef1f5,#cfd4dc)]",
          )}
        >
          <span className="font-display text-[40cqw] font-bold leading-none">{rank}</span>
          <span className="text-[20cqw] leading-none">{suit}</span>
        </div>
      ) : (
        <span
          className={cn(
            "absolute inset-0 grid place-items-center leading-none",
            rankIndex === 0 ? "text-[62cqw] drop-shadow-[0_2px_3px_rgb(0_0_0/0.25)]" : "text-[46cqw]",
          )}
        >
          {suit}
        </span>
      )}

      {/* Light catching the lacquer */}
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,rgb(255_255_255/0.7)_46%,transparent_60%)] opacity-50" />
    </div>
  );
}

function Corner({ rank, suit, className }: { rank: string; suit: string; className?: string }) {
  return (
    <span className={cn("absolute flex flex-col items-center leading-none", className)}>
      <span className="font-display text-[23cqw] font-bold tracking-[-0.06em]">{rank}</span>
      <span className="text-[17cqw]">{suit}</span>
    </span>
  );
}

/** Neon back of a card (the dealer hole card, the deck, the discard pile). */
export function CardBack({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "@container absolute inset-0 overflow-hidden border border-toxic/35 bg-[#04120a] p-[7%] shadow-[0_8px_18px_-8px_rgb(0_0_0/0.9)] [backface-visibility:hidden]",
        CARD_RADIUS,
        className,
      )}
    >
      <div className="grid size-full place-items-center rounded-[6%] border border-toxic/25 bg-[repeating-linear-gradient(45deg,rgb(57_255_20/0.14)_0_4px,transparent_4px_9px),repeating-linear-gradient(-45deg,rgb(57_255_20/0.07)_0_4px,transparent_4px_9px)]">
        <span className="grid aspect-square w-[46%] place-items-center rounded-full bg-black/75 font-display text-[22cqw] font-bold text-toxic shadow-[0_0_12px_rgb(57_255_20/0.45)] ring-1 ring-toxic/50">
          R
        </span>
      </div>
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgb(255_255_255/0.12)_48%,transparent_60%)]" />
    </div>
  );
}
