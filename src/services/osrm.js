const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";

const toPair = (point) => `${point.lng},${point.lat}`;

export async function fetchOsrmRoute(start, end, options = {}) {
  if (!start || !end) return null;

  const params = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    steps: "false"
  });

  const response = await fetch(
    `${OSRM_BASE_URL}/${toPair(start)};${toPair(end)}?${params.toString()}`,
    {
      method: "GET",
      signal: options.signal
    }
  );

  if (!response.ok) {
    throw new Error(`OSRM route request failed with ${response.status}`);
  }

  const data = await response.json();
  const route = data?.routes?.[0];
  if (!route) return null;

  return {
    coordinates: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60
  };
}

