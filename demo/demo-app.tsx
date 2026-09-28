import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { BonusButton, BonusWheelDialog } from "@/components/casino/bonus/bonus-wheel";
import { CelebrationLayer } from "@/components/casino/celebrations/celebration-layer";
import { Lobby, type LobbyLink } from "@/components/casino/lobby/lobby";
import { Balance } from "@/components/casino/shell/balance";
import { LiveToggle, Logo, SoundToggle } from "@/components/casino/shell/controls";
import { LiveDrawer, LivePanel } from "@/components/casino/shell/live-panel";
import { AmbientLight, ShellSkeleton } from "@/components/casino/shell/shell-parts";
import { useCasinoRuntime } from "@/components/casino/shell/use-casino-runtime";
import { GAME_ICONS, HomeIcon, ShieldIcon } from "@/components/casino/ui/icons";
import { LevelBadge } from "@/components/casino/vip/level-badge";
import { FairnessView } from "@/components/fairness/fairness-view";
import { CrashGame } from "@/components/games/crash/crash-game";
import { GameHeader } from "@/components/games/game-header";
import { LimboGame } from "@/components/games/limbo/limbo-game";
import { MinesGameView } from "@/components/games/mines/mines-game";
import { PlinkoGame } from "@/components/games/plinko/plinko-game";
import { audio } from "@/lib/audio/audio-engine";
import { GAME_IDS, GAMES } from "@/lib/casino/games";
import { cn } from "@/lib/cn";
import { useFairnessStore, createFairnessData } from "@/lib/stores/fairness-store";
import { useWalletStore } from "@/lib/stores/wallet-store";

/**
 * Guest demo: the same games as the app, but without login and server.
 * Navigation via the anchor in the address (#crash, #mines, …).
 */

const VIEWS = ["lobby", ...GAME_IDS, "fairness"] as const;
type View = (typeof VIEWS)[number];

const NAV: { view: View; label: string; icon: (props: { className?: string }) => ReactNode }[] = [
  { view: "lobby", label: "Lobby", icon: HomeIcon },
  ...GAME_IDS.map((id) => ({ view: id as View, label: GAMES[id].name, icon: GAME_ICONS[id] })),
  { view: "fairness", label: "Provably Fair", icon: ShieldIcon },
];

function readView(): View {
  const hash = window.location.hash.slice(1);
  return (VIEWS as readonly string[]).includes(hash) ? (hash as View) : "lobby";
}

const HashLink: LobbyLink = ({ href, className, onClick, onPointerEnter, children }) => (
  <a href={href} className={className} onClick={onClick} onPointerEnter={onPointerEnter}>
    {children}
  </a>
);

export function DemoApp() {
  const ready = useCasinoRuntime("guest", "Guest");
  const [view, setView] = useState<View>(readView);

  useEffect(() => {
    const onHashChange = () => {
      setView(readView());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-dvh bg-oled">
        <AmbientLight />
        <DemoTopBar ready={ready} view={view} />
        <div className="relative mx-auto flex w-full max-w-[1800px]">
          <DemoSideNav view={view} />
          <main className="min-w-0 flex-1 px-4 pb-10 pt-4 sm:px-5 lg:px-6 lg:pt-6">
            {ready ? (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={view}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <ViewContent view={view} />
                </motion.div>
              </AnimatePresence>
            ) : (
              <ShellSkeleton />
            )}
          </main>
          <LivePanel />
        </div>
        <LiveDrawer />
        {ready && <BonusWheelDialog />}
        <CelebrationLayer />
      </div>
    </MotionConfig>
  );
}

function ViewContent({ view }: { view: View }) {
  switch (view) {
    case "lobby":
      return (
        <div className="space-y-6">
          <Lobby Link={HashLink} hrefFor={(target) => `#${target}`} />
          <ResetPanel />
        </div>
      );
    case "crash":
      return (
        <>
          <GameHeader game="crash" />
          <CrashGame />
        </>
      );
    case "mines":
      return (
        <>
          <GameHeader game="mines" />
          <MinesGameView />
        </>
      );
    case "limbo":
      return (
        <>
          <GameHeader game="limbo" />
          <LimboGame />
        </>
      );
    case "plinko":
      return (
        <>
          <GameHeader game="plinko" />
          <PlinkoGame />
        </>
      );
    case "fairness":
      return (
        <>
          <div className="mb-5">
            <h1 className="font-display text-2xl font-bold uppercase tracking-wider text-white">Provably Fair</h1>
            <p className="text-sm text-zinc-500">Every result is fixed in advance and you can verify it.</p>
          </div>
          <FairnessView prefill={{}} />
        </>
      );
  }
}

function DemoTopBar({ ready, view }: { ready: boolean; view: View }) {
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-50 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1800px] items-center gap-3 px-3 sm:px-5">
        <a href="#lobby" className="flex items-center gap-2.5" onClick={() => audio.play("click")}>
          <span className="grid size-8 place-items-center rounded-lg bg-toxic/10 ring-1 ring-toxic/40 shadow-[0_0_20px_-4px_rgb(57_255_20/0.7)]">
            <span className="font-display text-sm font-bold text-toxic">R</span>
          </span>
          <Logo className="hidden sm:inline" />
        </a>
        <span className="hidden rounded-md border border-toxic/30 bg-toxic/[0.07] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-toxic md:inline">
          Guest demo · Play money
        </span>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {ready ? <Balance /> : <div className="glass h-9 w-28 animate-pulse rounded-xl sm:h-10 sm:w-32" />}
          {ready && <BonusButton />}
          {ready && <LevelBadge />}
          <SoundToggle />
          <LiveToggle />
        </div>
      </div>
      <nav className="scrollbar-none flex gap-1.5 overflow-x-auto px-3 pb-2.5 lg:hidden" aria-label="Games">
        {NAV.map((item) => (
          <NavLink key={item.view} item={item} active={item.view === view} layoutId="demo-mobile-nav" compact />
        ))}
      </nav>
    </header>
  );
}

function DemoSideNav({ view }: { view: View }) {
  return (
    <nav
      aria-label="Casino"
      className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r border-white/[0.06] px-3 py-5 lg:flex"
    >
      {NAV.map((item) => (
        <NavLink key={item.view} item={item} active={item.view === view} layoutId="demo-side-nav" />
      ))}
      <div className="mt-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs leading-relaxed text-zinc-500">
        <p className="mb-1 font-semibold text-zinc-300">Play money only</p>
        Guest demo of Rainbucks. No deposits, no withdrawals, no real money. Your progress stays in this browser.
      </div>
    </nav>
  );
}

function NavLink({
  item,
  active,
  layoutId,
  compact = false,
}: {
  item: (typeof NAV)[number];
  active: boolean;
  layoutId: string;
  compact?: boolean;
}) {
  const Icon = item.icon;
  return (
    <a
      href={`#${item.view}`}
      aria-current={active ? "page" : undefined}
      onClick={() => audio.play("click")}
      onPointerEnter={() => !compact && audio.play("hover")}
      className={cn(
        "relative flex shrink-0 items-center font-medium transition-colors",
        compact ? "gap-1.5 rounded-lg px-3 py-1.5 text-sm" : "gap-3 rounded-xl px-3 py-2.5 text-sm",
        active ? (compact ? "text-black" : "text-white") : "text-zinc-400 hover:text-white",
      )}
    >
      {active && (
        <motion.span
          layoutId={layoutId}
          className={
            compact
              ? "absolute inset-0 rounded-lg bg-toxic shadow-[0_0_16px_-2px_rgb(57_255_20/0.7)]"
              : "absolute inset-0 rounded-xl border border-toxic/30 bg-toxic/[0.08] shadow-[inset_3px_0_0_var(--color-toxic),0_0_24px_-10px_rgb(57_255_20/0.8)]"
          }
          transition={{ type: "spring", stiffness: 480, damping: 38 }}
        />
      )}
      <Icon className={cn("relative", compact ? "size-4" : "size-[18px]", active && !compact && "text-toxic")} />
      <span className="relative">{item.label}</span>
    </a>
  );
}

/** Reset progress, with an inline confirmation (confirm() is not available here). */
function ResetPanel() {
  const [confirming, setConfirming] = useState(false);
  const reset = () => {
    useWalletStore.getState().reset();
    useFairnessStore.setState(createFairnessData());
    setConfirming(false);
    audio.play("cashout");
  };
  return (
    <section className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4 text-sm">
      <p className="text-zinc-400">
        Guest demo: no account needed, your progress is only saved in this browser.
      </p>
      {confirming ? (
        <span className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-neon-red px-3 py-1.5 font-medium text-white shadow-glow-red"
          >
            Yes, reset to 1,000 RBX
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-zinc-300"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-zinc-400 transition hover:border-neon-red/50 hover:text-neon-red"
        >
          Reset progress
        </button>
      )}
    </section>
  );
}
