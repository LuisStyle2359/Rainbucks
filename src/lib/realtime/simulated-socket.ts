import { botReplyTo, nextId, randomBotBet, randomBotMessage, randomInt } from "./bots";
import type { ClientToServerEvents, ServerToClientEvents } from "./types";

type Listener<T> = (payload: T) => void;
type ServerEvent = keyof ServerToClientEvents;

/** Messages exchanged between tabs of the same browser. */
type TabMessage = {
  [E in ServerEvent]: { event: E; payload: ServerToClientEvents[E] };
}[ServerEvent];

/**
 * Simulated WebSocket with the same API shape as Socket.io:
 *
 *   const socket = getSocket();
 *   socket.on("chat:message", (msg) => …);
 *   socket.emit("chat:send", { user, text });
 *
 * Instead of a real server, bots create chat messages and bets.
 * Your own messages also reach other tabs through a BroadcastChannel.
 * For a real server you would only swap this class for socket.io-client;
 * the components stay the same.
 */
export class SimulatedSocket {
  connected = false;

  private readonly listeners = new Map<ServerEvent, Set<Listener<never>>>();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private channel: BroadcastChannel | null = null;
  private online = randomInt(1_150, 1_900);
  private seeded = false;

  on<E extends ServerEvent>(event: E, listener: Listener<ServerToClientEvents[E]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener<never>);
    return () => set.delete(listener as Listener<never>);
  }

  emit<E extends keyof ClientToServerEvents>(event: E, payload: ClientToServerEvents[E]): void {
    if (!this.connected) return;
    // Trip to the "server" + processing + trip back ≈ 40–110 ms
    this.later(randomInt(20, 55), () => this.handleClientEvent(event, payload));
  }

  connect(): void {
    if (this.connected) return;
    this.connected = true;

    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel("rainbucks-live");
      this.channel.onmessage = (event: MessageEvent<TabMessage>) => {
        this.dispatch(event.data);
      };
    }

    // Some history so chat and feed do not start empty (first connect only)
    if (!this.seeded) {
      this.seeded = true;
      for (let i = 0; i < 8; i++) {
        const message = randomBotMessage();
        message.createdAt -= (8 - i) * randomInt(4_000, 12_000);
        this.deliver("chat:message", message);
      }
      for (let i = 0; i < 12; i++) this.deliver("bets:new", randomBotBet());
    }
    this.deliver("presence:update", { online: this.online });

    this.loop(1_800, 7_000, () => this.deliver("chat:message", randomBotMessage()));
    this.loop(180, 1_400, () => this.deliver("bets:new", randomBotBet()));
    this.loop(4_000, 9_000, () => {
      this.online = Math.max(800, this.online + randomInt(-35, 40));
      this.deliver("presence:update", { online: this.online });
    });
  }

  disconnect(): void {
    this.connected = false;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.channel?.close();
    this.channel = null;
  }

  // ---------------------------------------------------------------------------

  private handleClientEvent<E extends keyof ClientToServerEvents>(
    event: E,
    payload: ClientToServerEvents[E],
  ): void {
    if (event === "chat:send") {
      const { user, text } = payload as ClientToServerEvents["chat:send"];
      const message = { id: nextId("msg"), user, text, createdAt: Date.now() };
      this.broadcast({ event: "chat:message", payload: message });

      const reply = botReplyTo(text, user);
      if (reply) this.later(randomInt(900, 2_600), () => this.deliver("chat:message", reply));
    }

    if (event === "bets:publish") {
      this.broadcast({ event: "bets:new", payload: payload as ClientToServerEvents["bets:publish"] });
    }
  }

  /** Deliver to this tab and pass on to other tabs. */
  private broadcast(message: TabMessage): void {
    this.dispatch(message);
    this.channel?.postMessage(message);
  }

  private dispatch(message: TabMessage): void {
    this.deliver(message.event, message.payload as never);
  }

  private deliver<E extends ServerEvent>(event: E, payload: ServerToClientEvents[E]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of set) (listener as Listener<ServerToClientEvents[E]>)(payload);
  }

  private later(ms: number, fn: () => void): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, ms);
    this.timers.add(timer);
  }

  /** Recurring event with a random interval. Pauses in background tabs. */
  private loop(minMs: number, maxMs: number, fn: () => void): void {
    const tick = () => {
      if (!this.connected) return;
      if (document.visibilityState === "visible") fn();
      this.later(randomInt(minMs, maxMs), tick);
    };
    this.later(randomInt(minMs, maxMs), tick);
  }
}

let socket: SimulatedSocket | null = null;

/** One connection per tab (like a real socket). */
export function getSocket(): SimulatedSocket {
  socket ??= new SimulatedSocket();
  return socket;
}
