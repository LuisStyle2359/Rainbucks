import Link from "next/link";

const features = [
  {
    title: "Sicherer Login",
    text: "Passwörter werden nie im Klartext gespeichert, sondern mit bcrypt gehasht.",
  },
  {
    title: "Geschützter Bereich",
    text: "Das Dashboard ist nur für eingeloggte Nutzer erreichbar.",
  },
  {
    title: "Überall nutzbar",
    text: "Das responsive Design funktioniert auf Handy, Tablet und Desktop.",
  },
];

export default function Home() {
  return (
    <>
      <section className="bg-gradient-to-b from-indigo-50 to-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:py-28">
          <p className="mb-4 inline-block rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
            Jetzt kostenlos starten
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
            Willkommen bei <span className="text-indigo-600">Rainbucks</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-slate-600">
            Erstelle dein Konto in wenigen Sekunden und greife auf deinen
            persönlichen Bereich zu.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Konto erstellen
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 hover:bg-slate-100"
            >
              Ich habe schon ein Konto
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold">{feature.title}</h2>
            <p className="mt-2 text-slate-600">{feature.text}</p>
          </div>
        ))}
      </section>
    </>
  );
}
