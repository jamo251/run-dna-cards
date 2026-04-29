import RunCard, { type RunCardProps } from "@/app/components/RunCard";

const PREVIEW_COORDINATES: Array<[number, number]> = [
  [-26.105, 28.045],
  [-26.1045, 28.0455],
  [-26.104, 28.0465],
  [-26.1035, 28.048],
  [-26.103, 28.0495],
  [-26.1028, 28.0505],
  [-26.1025, 28.0515],
  [-26.1018, 28.0525],
  [-26.101, 28.053],
  [-26.1, 28.0532],
  [-26.0992, 28.0528],
  [-26.0985, 28.052],
  [-26.0978, 28.051],
  [-26.0972, 28.0498],
  [-26.097, 28.0485],
  [-26.0975, 28.047],
  [-26.0982, 28.046],
  [-26.099, 28.045],
  [-26.1, 28.0445],
  [-26.1012, 28.0442],
  [-26.1025, 28.0445],
  [-26.1035, 28.0448],
  [-26.105, 28.045],
];

const PREVIEW_PROPS: RunCardProps = {
  runName: "Sandton Sunrise Sprint",
  runType: "Mountaineer",
  rarity: "Legendary",
  stats: {
    distance: 72,
    elevation: 85,
    pace: 61,
    consistency: 78,
    suffer: 54,
    novelty: 50,
  },
  coordinates: PREVIEW_COORDINATES,
  runNumber: 1,
  isFirstOnRoute: true,
};

export default function CardPreview() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0f] px-6 py-16">
      <header className="mb-10 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Card Preview
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Realistic hardcoded props. Real uploads use the home page.
        </p>
      </header>

      <RunCard {...PREVIEW_PROPS} />
    </main>
  );
}
