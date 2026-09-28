import type { Metadata } from "next";
import { FairnessView, type VerifyPrefill } from "@/components/fairness/fairness-view";
import { ShieldIcon } from "@/components/casino/ui/icons";

export const metadata: Metadata = { title: "Provably Fair" };

const GAMES = ["crash", "limbo", "mines", "plinko"] as const;

export default async function FairnessPage({ searchParams }: PageProps<"/casino/fairness">) {
  const params = await searchParams;
  const get = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : undefined;
  };
  const game = GAMES.find((g) => g === get("game"));

  const prefill: VerifyPrefill = {
    game,
    serverSeedHash: get("hash"),
    clientSeed: get("client"),
    nonce: get("nonce"),
    mines: get("mines"),
    rows: get("rows"),
    risk: get("risk"),
  };

  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-toxic/10 text-toxic ring-1 ring-toxic/30 shadow-[0_0_24px_-6px_rgb(57_255_20/0.7)]">
          <ShieldIcon className="size-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider text-white">Provably Fair</h1>
          <p className="text-sm text-zinc-500">Every result is fixed in advance and you can verify it.</p>
        </div>
      </div>
      <FairnessView prefill={prefill} />
    </>
  );
}
