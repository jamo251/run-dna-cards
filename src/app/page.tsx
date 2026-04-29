import Link from "next/link";
import GpxUploader from "./components/GpxUploader";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-16">
      <nav className="mb-8 flex w-full max-w-xl items-center justify-end gap-5 text-sm font-semibold text-white/70">
        <Link
          href="/collection"
          className="rounded underline-offset-4 transition-colors hover:text-white hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
        >
          My collection
        </Link>
        <Link
          href="/battle"
          className="rounded underline-offset-4 transition-colors hover:text-white hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
        >
          ⚔️ Battle
        </Link>
      </nav>

      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Run DNA Cards
        </h1>
        <p className="mt-3 text-base text-white/60">
          Upload a GPX file. Get a collectible card.
        </p>
      </header>

      <GpxUploader />

      <footer className="mt-12 text-xs text-white/30">
        Session 1 — upload only. Parsing & cards coming next.
      </footer>
    </main>
  );
}
