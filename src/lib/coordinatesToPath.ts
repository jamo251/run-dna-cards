const MAX_POINTS = 300;
const DEFAULT_PADDING = 20;

function downsample(
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

export function coordinatesToPath(
  coordinates: Array<[number, number]>,
  viewBoxWidth: number,
  viewBoxHeight: number,
  padding: number = DEFAULT_PADDING
): string {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return "";
  if (viewBoxWidth <= 0 || viewBoxHeight <= 0) return "";

  const sampled = downsample(coordinates);
  if (sampled.length === 0) return "";

  const lats = sampled.map((point) => point[0]);
  const lons = sampled.map((point) => point[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const latRange = maxLat - minLat;
  const lonRange = maxLon - minLon;
  const drawableWidth = Math.max(0, viewBoxWidth - padding * 2);
  const drawableHeight = Math.max(0, viewBoxHeight - padding * 2);

  if (latRange === 0 && lonRange === 0) {
    const cx = viewBoxWidth / 2;
    const cy = viewBoxHeight / 2;
    return `M ${cx} ${cy} L ${cx} ${cy}`;
  }

  const scaleX =
    lonRange === 0 ? Number.POSITIVE_INFINITY : drawableWidth / lonRange;
  const scaleY =
    latRange === 0 ? Number.POSITIVE_INFINITY : drawableHeight / latRange;
  const scale = Math.min(scaleX, scaleY);

  const routeWidth = lonRange === 0 ? 0 : lonRange * scale;
  const routeHeight = latRange === 0 ? 0 : latRange * scale;
  const offsetX = padding + (drawableWidth - routeWidth) / 2;
  const offsetY = padding + (drawableHeight - routeHeight) / 2;

  const segments = sampled.map(([lat, lon], index) => {
    const x =
      lonRange === 0 ? viewBoxWidth / 2 : offsetX + (lon - minLon) * scale;
    const y =
      latRange === 0 ? viewBoxHeight / 2 : offsetY + (maxLat - lat) * scale;
    const command = index === 0 ? "M" : "L";
    return `${command} ${x.toFixed(2)} ${y.toFixed(2)}`;
  });

  return segments.join(" ");
}
