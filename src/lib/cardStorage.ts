import type { RunType } from "@/lib/classifier";
import type { NormalizedStats, RarityTier } from "@/lib/scorer";

export type StoredCard = {
  id?: number;
  runName: string;
  runType: RunType;
  rarity: RarityTier;
  stats: NormalizedStats;
  coordinates: Array<[number, number]>;
  routeFingerprint: string;
  isFirstOnRoute: boolean;
  createdAt: number;
  evolutionCount: number;
  evolvedAt?: number;
};

export type EvolveCardUpdate = {
  stats: NormalizedStats;
  rarity: RarityTier;
  coordinates: Array<[number, number]>;
  routeFingerprint: string;
  evolutionCount: number;
  evolvedAt: number;
};

const DB_NAME = "run-dna-cards";
const DB_VERSION = 1;
const STORE_NAME = "cards";
const MAX_FINGERPRINT_POINTS = 300;
const FINGERPRINT_DECIMALS = 3;

let dbPromise: Promise<IDBDatabase> | null = null;

function ensureBrowser(): void {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB unavailable in this environment");
  }
}

export function initDB(): Promise<IDBDatabase> {
  ensureBrowser();
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("runType", "runType", { unique: false });
        store.createIndex("rarity", "rarity", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
    request.onblocked = () =>
      reject(new Error("IndexedDB upgrade blocked by another tab"));
  });

  dbPromise.catch(() => {
    dbPromise = null;
  });

  return dbPromise;
}

function normalizeStoredCard(raw: StoredCard): StoredCard {
  return {
    ...raw,
    evolutionCount:
      typeof raw.evolutionCount === "number" ? raw.evolutionCount : 0,
  };
}

export async function saveCard(card: StoredCard): Promise<number> {
  const db = await initDB();
  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const { id: _ignored, ...rest } = card;
    void _ignored;
    const payload = {
      ...rest,
      evolutionCount:
        typeof rest.evolutionCount === "number" ? rest.evolutionCount : 0,
    };
    const request = store.add(payload);
    request.onsuccess = () => {
      const newId = request.result;
      if (typeof newId === "number") {
        resolve(newId);
      } else {
        reject(new Error("Unexpected non-numeric id from IndexedDB"));
      }
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to save card"));
  });
}

export async function evolveCard(
  id: number,
  updates: EvolveCardUpdate
): Promise<void> {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const existing = getRequest.result as StoredCard | undefined;
      if (!existing) {
        reject(new Error(`Card with id ${id} not found`));
        return;
      }
      const merged: StoredCard = {
        ...existing,
        ...updates,
        id: existing.id,
        runName: existing.runName,
        runType: existing.runType,
        isFirstOnRoute: existing.isFirstOnRoute,
        createdAt: existing.createdAt,
      };
      const putRequest = store.put(merged);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () =>
        reject(putRequest.error ?? new Error("Failed to evolve card"));
    };
    getRequest.onerror = () =>
      reject(getRequest.error ?? new Error("Failed to read card"));
  });
}

export async function getAllCards(): Promise<StoredCard[]> {
  const db = await initDB();
  return new Promise<StoredCard[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const rows = (request.result ?? []) as StoredCard[];
      resolve(rows.map(normalizeStoredCard));
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to load cards"));
  });
}

export async function getCardCount(): Promise<number> {
  const db = await initDB();
  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to count cards"));
  });
}

export function downsampleCoordinates(
  coordinates: Array<[number, number]>,
  max: number = MAX_FINGERPRINT_POINTS
): Array<[number, number]> {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return [];
  if (coordinates.length <= max) return coordinates.slice();

  const step = Math.ceil(coordinates.length / max);
  const sampled: Array<[number, number]> = [];

  for (let i = 0; i < coordinates.length; i += step) {
    sampled.push(coordinates[i]);
  }

  const last = coordinates[coordinates.length - 1];
  const sampledLast = sampled[sampled.length - 1];
  if (
    sampledLast == null ||
    sampledLast[0] !== last[0] ||
    sampledLast[1] !== last[1]
  ) {
    sampled.push(last);
  }

  return sampled;
}

function djb2(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function getRouteFingerprint(
  coordinates: Array<[number, number]>
): string {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return "0";

  const sampled = downsampleCoordinates(coordinates, MAX_FINGERPRINT_POINTS);
  if (sampled.length === 0) return "0";

  const serialized = sampled
    .map(
      ([lat, lon]) =>
        `${lat.toFixed(FINGERPRINT_DECIMALS)},${lon.toFixed(FINGERPRINT_DECIMALS)}`
    )
    .join("|");

  return djb2(serialized);
}
