import GpxUploader from "./components/GpxUploader";
import SiteNav from "./components/SiteNav";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-16">
      <SiteNav className="mb-8 max-w-xl" />

      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Run DNA Cards
        </h1>
        <p className="mt-3 text-base text-white/60">
          Upload a GPX file. Get a collectible card.
        </p>
        <p className="mt-2 max-w-md text-xs text-white/45">
          GPX mints a card, saves it locally in your collection, then you can battle and export or share a PNG.
        </p>
      </header>

      <GpxUploader />

      <footer className="mt-12 text-center text-xs text-white/30">
        Cards stay on this device. Download or share PNGs anytime after you upload.
      </footer>
    </main>
  );
}
