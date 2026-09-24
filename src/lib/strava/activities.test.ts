import assert from "node:assert/strict";
import { test } from "node:test";
import {
  filterImportableRuns,
  isImportableRun,
  isRunningActivity,
  type StravaActivity,
} from "./activities";

function activity(overrides: Partial<StravaActivity> = {}): StravaActivity {
  return {
    id: 1,
    name: "Morning Run",
    sport_type: "Run",
    type: "Run",
    start_date: "2026-04-01T12:00:00Z",
    distance: 5000,
    moving_time: 1500,
    map: { summary_polyline: "abc" },
    ...overrides,
  };
}

test("keeps GPS runs and trail runs", () => {
  const runs = filterImportableRuns([
    activity({ id: 1, name: "Park loop" }),
    activity({
      id: 2,
      name: "Ridge",
      sport_type: "TrailRun",
      type: "Run",
    }),
    activity({
      id: 3,
      name: "Treadmill",
      sport_type: "VirtualRun",
      type: "Run",
    }),
  ]);

  assert.deepEqual(
    runs.map((run) => run.id),
    [1, 2, 3]
  );
  assert.equal(runs[0]?.distanceKm, 5);
  assert.equal(runs[0]?.movingTimeMinutes, 25);
});

test("skips rides and activities without GPS", () => {
  assert.equal(
    isImportableRun(
      activity({
        id: 10,
        name: "Saturday ride",
        sport_type: "Ride",
        type: "Ride",
      })
    ),
    false
  );
  assert.equal(
    isImportableRun(activity({ map: { summary_polyline: "" } })),
    false
  );
  assert.equal(isImportableRun(activity({ map: null })), false);
  assert.equal(isRunningActivity(activity({ map: null })), true);
});

test("accepts legacy type=Run when sport_type is missing", () => {
  assert.equal(
    isImportableRun(
      activity({
        sport_type: undefined,
        type: "Run",
      })
    ),
    true
  );
});
