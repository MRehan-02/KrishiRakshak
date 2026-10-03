// Maharashtra District Centers for KrishiRakshak
export const DISTRICT_CENTERS = {
  Pune: { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  Nashik: { name: 'Nashik', lat: 19.9975, lng: 73.7898 },
  Solapur: { name: 'Solapur', lat: 17.6599, lng: 75.9064 },
};

export const DISTRICT_LIST = ['Pune', 'Nashik', 'Solapur'];

/**
 * Calculates nearest district from coordinates without needing geocoding API.
 * Uses Haversine distance formula.
 * @param {number} lat 
 * @param {number} lng 
 * @returns {string} Nearest district name ('Pune', 'Nashik', or 'Solapur')
 */
export function nearestDistrict(lat, lng) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
    return 'Pune';
  }

  const toRad = (val) => (val * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  let minDistance = Infinity;
  let closestDistrict = 'Pune';

  for (const [key, center] of Object.entries(DISTRICT_CENTERS)) {
    const dLat = toRad(center.lat - lat);
    const dLng = toRad(center.lng - lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat)) * Math.cos(toRad(center.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    if (distance < minDistance) {
      minDistance = distance;
      closestDistrict = key;
    }
  }

  return closestDistrict;
}
