const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

const jsonHeaders = {
  Accept: "application/json"
};

const parseCoordinate = (value) => Number.parseFloat(value);

const getCityFromAddress = (address = {}) =>
  address.city ||
  address.town ||
  address.village ||
  address.municipality ||
  address.county ||
  address.state_district ||
  address.state ||
  "";

export async function searchAddressSuggestions(query, options = {}) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const params = new URLSearchParams({
    q: trimmedQuery,
    format: "jsonv2",
    addressdetails: "1",
    limit: String(options.limit || 5)
  });

  const response = await fetch(
    `${NOMINATIM_BASE_URL}/search?${params.toString()}`,
    {
      method: "GET",
      headers: jsonHeaders,
      signal: options.signal
    }
  );

  if (!response.ok) {
    throw new Error(`Nominatim search failed with ${response.status}`);
  }

  const data = await response.json();
  return data.map((item) => ({
    id: item.place_id,
    displayName: item.display_name,
    lat: parseCoordinate(item.lat),
    lng: parseCoordinate(item.lon),
    city: getCityFromAddress(item.address)
  }));
}

export async function reverseGeocodeCoordinates(coordinates, options = {}) {
  if (!coordinates) return "";

  const params = new URLSearchParams({
    lat: String(coordinates.lat),
    lon: String(coordinates.lng),
    format: "jsonv2"
  });

  const response = await fetch(
    `${NOMINATIM_BASE_URL}/reverse?${params.toString()}`,
    {
      method: "GET",
      headers: jsonHeaders,
      signal: options.signal
    }
  );

  if (!response.ok) {
    throw new Error(`Nominatim reverse geocode failed with ${response.status}`);
  }

  const data = await response.json();
  return {
    displayName: data.display_name || "",
    city: getCityFromAddress(data.address)
  };
}
