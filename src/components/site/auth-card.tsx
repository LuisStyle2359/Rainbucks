import type { InputHTMLAttributes, ReactNode } from "react";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="glass glass-edge w-full max-w-md rounded-3xl p-8 shadow-glow-soft">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wider text-white">{title}</h1>
        <p className="mt-1 text-zinc-400">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, ...inputProps }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">{label}</span>
      <input
        {...inputProps}
        className="mt-1.5 block h-11 w-full rounded-lg border border-white/[0.08] bg-black/50 px-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-toxic/60 focus:shadow-[0_0_0_3px_rgb(57_255_20/0.15)]"
      />
    </label>
  );
}

export function Alert({ type, children }: { type: "error" | "success"; children: ReactNode }) {
  const styles =
    type === "error"
      ? "border-neon-red/40 bg-neon-red/10 text-neon-red-300"
      : "border-toxic/40 bg-toxic/10 text-toxic-300";
  return (
    <p role="alert" className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>
      {children}
    </p>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-xl bg-toxic px-4 font-display font-bold uppercase tracking-wider text-black shadow-glow-toxic transition hover:-translate-y-0.5 hover:bg-[#5bff3d] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Please wait …" : children}
    </button>
  );
}
