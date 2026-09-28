import type { JSX, SVGProps } from "react";
import { GAME_ICONS, HomeIcon, ShieldIcon, UserIcon } from "@/components/casino/ui/icons";
import { GAME_IDS, GAMES } from "@/lib/casino/games";

export interface NavItem {
  href: string;
  label: string;
  icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
}

export const LOBBY_ITEM: NavItem = { href: "/casino", label: "Lobby", icon: HomeIcon };

export const GAME_ITEMS: NavItem[] = GAME_IDS.map((id) => ({
  href: GAMES[id].href,
  label: GAMES[id].name,
  icon: GAME_ICONS[id],
}));

export const ACCOUNT_ITEMS: NavItem[] = [
  { href: "/casino/fairness", label: "Provably Fair", icon: ShieldIcon },
  { href: "/dashboard", label: "Dashboard", icon: UserIcon },
];

export const ALL_ITEMS = [LOBBY_ITEM, ...GAME_ITEMS, ...ACCOUNT_ITEMS];

/** Exakter Treffer für die Lobby, Präfix für alles andere. */
export function isActive(pathname: string, href: string): boolean {
  return href === "/casino" ? pathname === "/casino" : pathname === href || pathname.startsWith(`${href}/`);
}
