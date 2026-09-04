import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHTML } from "linkedom";
import { normalizeStreams, streamsToGpx } from "./streamsToGpx";

const START = "2026-04-01T12:00:00.000Z";

function installDomParser(): void {
  const { window } = parseHTML("<!doctype html><html></html>");
  globalThis.DOMParser = window.DOMParser as typeof DOMParser;
}

test("streamsToGpx writes trackpoints with ele, time, and hr", () => {
  const gpx = streamsToGpx(
    {
      latlng: { data: [
        [37.7749, -122.4194],
        [37.7839, -122.4194],
      ] },
      altitude: { data: [10, 30] },
      time: { data: [0, 360] },
      heartrate: { data: [140, 150] },
    },
    { name: "Morning Run", startDate: START }
  );

  assert.match(gpx, /<name>Morning Run<\/name>/);
  assert.match(gpx, /lat="37.7749" lon="-122.4194"/);
  assert.match(gpx, /<ele>10<\/ele>/);
  assert.match(gpx, /<ele>30<\/ele>/);
  assert.match(gpx, /<time>2026-04-01T12:00:00.000Z<\/time>/);
  assert.match(gpx, /<time>2026-04-01T12:06:00.000Z<\/time>/);
  assert.match(gpx, /<hr>140<\/hr>/);
  assert.match(gpx, /<hr>150<\/hr>/);
});

test("streamsToGpx escapes activity names", () => {
  const gpx = streamsToGpx(
    {
      latlng: { data: [
        [0, 0],
        [0.01, 0],
      ] },
    },
    { name: `A & B's "loop" <fast>`, startDate: START }
  );
  assert.match(gpx, /<name>A &amp; B&apos;s &quot;loop&quot; &lt;fast&gt;<\/name>/);
});

test("streamsToGpx rejects tracks without GPS", () => {
  assert.throws(
    () => streamsToGpx({ latlng: { data: [[1, 2]] } }, { name: "x", startDate: START }),
    /no GPS track/
  );
});

test("normalizeStreams accepts array and keyed payloads", () => {
  const keyed = normalizeStreams({
    latlng: { data: [[1, 2], [3, 4]] },
  });
  const listed = normalizeStreams([
    { type: "latlng", data: [[1, 2], [3, 4]] },
    { type: "heartrate", data: [120, 130] },
  ]);
  assert.deepEqual(keyed.latlng?.data, [[1, 2], [3, 4]]);
  assert.deepEqual(listed.heartrate?.data, [120, 130]);
});

test("streamsToGpx then parseGpx keeps distance, elevation, and HR", async () => {
  installDomParser();
  const { parseGpx } = await import("../gpxParser");

  const gpx = streamsToGpx(
    {
      latlng: { data: [
        [37.7749, -122.4194],
        [37.7839, -122.4194],
      ] },
      altitude: { data: [10, 30] },
      time: { data: [0, 360] },
      heartrate: { data: [140, 150] },
    },
    { name: "Morning Run", startDate: START }
  );

  const parsed = parseGpx(gpx);
  assert.ok(parsed.totalDistanceKm > 0.9 && parsed.totalDistanceKm < 1.1);
  assert.equal(parsed.totalElevationGainM, 20);
  assert.ok(parsed.heartRate.average != null);
  assert.equal(Math.round(parsed.heartRate.average), 145);
  assert.deepEqual(parsed.heartRate.perTrackpoint, [140, 150]);
  assert.equal(parsed.coordinates.length, 2);
});
