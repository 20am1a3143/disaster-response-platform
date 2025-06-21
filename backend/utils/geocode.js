// backend/utils/geocode.js
const axios = require('axios');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const MAPBOX_API_KEY = process.env.MAPBOX_API_KEY;

async function geocodeLocation(locationName) {
  // Try Google Maps first
  if (GOOGLE_MAPS_API_KEY) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationName)}&key=${GOOGLE_MAPS_API_KEY}`;
    const { data } = await axios.get(url);
    if (data.results && data.results[0]) {
      const loc = data.results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng };
    }
  }
  // Fallback: Mapbox
  if (MAPBOX_API_KEY) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationName)}.json?access_token=${MAPBOX_API_KEY}`;
    const { data } = await axios.get(url);
    if (data.features && data.features[0]) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }
  }
  // Fallback: OpenStreetMap Nominatim
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`;
  const { data } = await axios.get(url);
  if (data && data[0]) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }
  throw new Error('Geocoding failed');
}

module.exports = { geocodeLocation };