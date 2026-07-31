let map;
let marker;
let routeLayer;
let currentPosition = null;
let lastPickup = null;

const ambulanceCompanies = [
  {
    id: 'metro',
    name: 'Metro Med EMS',
    base: { lat: 40.758, lng: -73.985 },
    responseSpeedKmph: 55,
    routeSpeedKmph: 70,
    hospitals: [
      { name: 'City General Hospital', lat: 40.7128, lng: -74.006 },
      { name: 'Northside Medical Center', lat: 40.7306, lng: -73.9352 },
    ],
  },
  {
    id: 'harbor',
    name: 'Harbor Rescue',
    base: { lat: 40.699, lng: -74.024 },
    responseSpeedKmph: 45,
    routeSpeedKmph: 60,
    hospitals: [
      { name: 'Harbor Care Hospital', lat: 40.6892, lng: -74.0445 },
      { name: 'City General Hospital', lat: 40.7128, lng: -74.006 },
    ],
  },
  {
    id: 'rapid',
    name: 'RapidCare Ambulance',
    base: { lat: 40.75, lng: -73.92 },
    responseSpeedKmph: 65,
    routeSpeedKmph: 75,
    hospitals: [
      { name: 'Northside Medical Center', lat: 40.7306, lng: -73.9352 },
      { name: 'Harbor Care Hospital', lat: 40.6892, lng: -74.0445 },
    ],
  },
];

function initMap() {
  map = L.map('map').setView([40.7128, -74.006], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
}

async function fetchRoute(start, end) {
  const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Route request failed with ${response.status}`);
    }

    const data = await response.json();
    if (!data.routes?.length) {
      throw new Error('No route found');
    }

    const route = data.routes[0];
    const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    return {
      coordinates,
      distanceKm: route.distance / 1000,
      durationMinutes: Math.max(3, Math.round(route.duration / 60)),
    };
  } catch (error) {
    console.warn('Routing API unavailable, using fallback route.', error);
    const fallbackCoordinates = [
      [start.lat, start.lng],
      [end.lat, end.lng],
    ];

    return {
      coordinates: fallbackCoordinates,
      distanceKm: getDistanceKm(start, end),
      durationMinutes: Math.max(3, Math.round((getDistanceKm(start, end) / 60) * 60)),
    };
  }
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function getDistanceKm(start, end) {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(end.lat - start.lat);
  const lngDelta = toRadians(end.lng - start.lng);
  const startLatRad = toRadians(start.lat);
  const endLatRad = toRadians(end.lat);

  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(startLatRad) * Math.cos(endLatRad) * Math.sin(lngDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function getEtaMinutes(distanceKm, speedKmph, baseMinutes) {
  return Math.max(3, Math.round((distanceKm / speedKmph) * 60 + baseMinutes));
}

async function getRoutePlan(company, pickupLocation) {
  const nearestHospital = company.hospitals
    .map((hospital) => ({
      ...hospital,
      distanceKm: getDistanceKm(pickupLocation, hospital),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];

  const [responseRoute, hospitalRoute] = await Promise.all([
    fetchRoute(company.base, pickupLocation),
    fetchRoute(pickupLocation, nearestHospital),
  ]);

  return {
    company,
    destination: nearestHospital,
    pickupEtaMinutes: Math.max(3, Math.round(responseRoute.durationMinutes + 1)),
    hospitalEtaMinutes: Math.max(3, Math.round(hospitalRoute.durationMinutes + 1)),
    routeCoordinates: hospitalRoute.coordinates,
  };
}

function setStatus(message) {
  const card = document.getElementById('status-card');
  card.innerHTML = `<h2>Current status</h2>${message}`;
}

function updateMap(position, destination, routeCoordinates) {
  if (!map) initMap();

  const latlng = [position.lat, position.lng];

  if (!marker) {
    marker = L.marker(latlng).addTo(map);
  } else {
    marker.setLatLng(latlng);
  }

  map.setView(latlng, 14);

  if (routeLayer) {
    map.removeLayer(routeLayer);
  }

  const destinationLatLng = [destination.lat, destination.lng];
  const route = L.polyline(routeCoordinates, { color: '#ff4d4f', weight: 5 }).addTo(map);
  routeLayer = route;

  const hospitalMarker = L.marker(destinationLatLng, {
    icon: L.divIcon({
      html: '🏥',
      className: 'hospital-icon',
      iconSize: [24, 24],
    }),
  }).addTo(map);

  hospitalMarker.bindPopup(destination.name);
}

function handleLocationSuccess(position) {
  currentPosition = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };

  document.getElementById('locate-btn').textContent = 'Location ready';
  setStatus('<p>Your location has been captured. You can now log a pickup.</p>');
}

function handleLocationError() {
  setStatus('<p>Location access was denied. Using a default location instead.</p>');
  currentPosition = { lat: 40.7128, lng: -74.006 };
}

async function handlePickup(event) {
  event.preventDefault();

  if (!currentPosition) {
    currentPosition = { lat: 40.7128, lng: -74.006 };
  }

  const companyId = document.getElementById('company-select').value;
  const company = ambulanceCompanies.find((entry) => entry.id === companyId) || ambulanceCompanies[0];
  const routePlan = await getRoutePlan(company, currentPosition);

  lastPickup = {
    ambulanceId: document.getElementById('ambulance-id').value,
    patientName: document.getElementById('patient-name').value || 'Unknown',
    from: currentPosition,
    company: routePlan.company,
    destination: routePlan.destination,
    pickupEtaMinutes: routePlan.pickupEtaMinutes,
    hospitalEtaMinutes: routePlan.hospitalEtaMinutes,
  };

  updateMap(lastPickup.from, lastPickup.destination, routePlan.routeCoordinates);

  setStatus(`
    <p>${lastPickup.ambulanceId} picked up ${lastPickup.patientName} from your location and is heading to ${lastPickup.destination.name}.</p>
    <ul class="eta-list">
      <li><strong>Company:</strong> ${lastPickup.company.name}</li>
      <li><strong>Pickup ETA:</strong> about ${lastPickup.pickupEtaMinutes} minutes</li>
      <li><strong>Hospital arrival ETA:</strong> about ${lastPickup.hospitalEtaMinutes} minutes</li>
      <li><strong>Closest hospital on route:</strong> ${lastPickup.destination.name}</li>
    </ul>
  `);
}

function attachEvents() {
  document.getElementById('locate-btn').addEventListener('click', () => {
    if (!navigator.geolocation) {
      handleLocationError();
      return;
    }

    navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError);
  });

  document.getElementById('pickup-form').addEventListener('submit', handlePickup);
}

window.addEventListener('DOMContentLoaded', () => {
  initMap();
  attachEvents();
  setStatus('<p>Tap “Use my location” and then log a pickup.</p>');
});
