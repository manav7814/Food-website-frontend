const EARTH_RADIUS_KM = 6371;

const toRadians = (value) => (value * Math.PI) / 180;

export const haversineDistanceKm = (source, destination) => {
  if (!source || !destination) return null;

  const dLat = toRadians(destination.lat - source.lat);
  const dLng = toRadians(destination.lng - source.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(source.lat)) *
      Math.cos(toRadians(destination.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

