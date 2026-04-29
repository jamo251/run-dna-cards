type RouteMapProps = {
  coordinates: Array<[number, number]>;
};

const MAX_POINTS = 300;
const SVG_WIDTH = 400;
const SVG_HEIGHT = 300;
const PADDING = 20;

function downsampleCoordinates(
  coordinates: Array<[number, number]>
): Array<[number, number]> {
  if (coordinates.length <= MAX_POINTS) return coordinates;

  const step = Math.ceil(coordinates.length / MAX_POINTS);
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

function createPathData(coordinates: Array<[number, number]>): string {
  if (coordinates.length === 0) return "";

  const lats = coordinates.map((point) => point[0]);
  const lons = coordinates.map((point) => point[1]);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const latRange = maxLat - minLat;
  const lonRange = maxLon - minLon;
  const drawableWidth = SVG_WIDTH - PADDING * 2;
  const drawableHeight = SVG_HEIGHT - PADDING * 2;

  if (latRange === 0 && lonRange === 0) {
    const cx = SVG_WIDTH / 2;
    const cy = SVG_HEIGHT / 2;
    return `M ${cx} ${cy} L ${cx} ${cy}`;
  }

  const scaleX = lonRange === 0 ? Number.POSITIVE_INFINITY : drawableWidth / lonRange;
  const scaleY = latRange === 0 ? Number.POSITIVE_INFINITY : drawableHeight / latRange;
  const scale = Math.min(scaleX, scaleY);

  const routeWidth = lonRange === 0 ? 0 : lonRange * scale;
  const routeHeight = latRange === 0 ? 0 : latRange * scale;
  const offsetX = PADDING + (drawableWidth - routeWidth) / 2;
  const offsetY = PADDING + (drawableHeight - routeHeight) / 2;

  const mapped = coordinates.map(([lat, lon]) => {
    const x = lonRange === 0 ? SVG_WIDTH / 2 : offsetX + (lon - minLon) * scale;
    const y =
      latRange === 0
        ? SVG_HEIGHT / 2
        : offsetY + (maxLat - lat) * scale;
    return [x, y] as [number, number];
  });

  return mapped
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
}

export default function RouteMap({ coordinates }: RouteMapProps) {
  const sampledCoordinates = downsampleCoordinates(coordinates);
  const pathData = createPathData(sampledCoordinates);

  return (
    <svg
      width={SVG_WIDTH}
      height={SVG_HEIGHT}
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      className="mt-4"
      role="img"
      aria-label="Run route map"
    >
      {pathData !== "" && (
        <path
          d={pathData}
          fill="none"
          stroke="white"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
