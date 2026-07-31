let map;
let marker;
let routeLayer;
let currentPosition = null;
let lastPickup = null;

const hospitals = [
  { name: 'City General Hospital', lat: 40.7128, lng: -74.006 },
  { name: 'Northside Medical Center', lat: 40.7306, lng: -73.9352 },
  { name: 'Harbor Care Hospital', lat: 40.6892, lng: -74.0445 },
];

function initMap() {
  map = L.map('map').setView([40.7128, -74.006], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
}

function setStatus(message) {
  const card = document.getElementById('status-card');
  card.innerHTML = `<h2>Current status</h2><p>${message}</p>`;
}

function updateMap(position, destination) {
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
  const route = L.polyline([latlng, destinationLatLng], { color: '#ff4d4f', weight: 5 }).addTo(map);
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

function getDestination() {
  const index = Math.floor(Math.random() * hospitals.length);
  return hospitals[index];
}

function handleLocationSuccess(position) {
  currentPosition = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };

  document.getElementById('locate-btn').textContent = 'Location ready';
  setStatus('Your location has been captured. You can now log a pickup.');
}

function handleLocationError() {
  setStatus('Location access was denied. Using a default location instead.');
  currentPosition = { lat: 40.7128, lng: -74.006 };
}

function handlePickup(event) {
  event.preventDefault();

  if (!currentPosition) {
    currentPosition = { lat: 40.7128, lng: -74.006 };
  }

  const destination = getDestination();
  lastPickup = {
    ambulanceId: document.getElementById('ambulance-id').value,
    patientName: document.getElementById('patient-name').value || 'Unknown',
    from: currentPosition,
    destination,
  };

  updateMap(lastPickup.from, lastPickup.destination);

  setStatus(
    `${lastPickup.ambulanceId} picked up ${lastPickup.patientName} from your location and is heading to ${lastPickup.destination.name}.`
  );
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
  setStatus('Tap “Use my location” and then log a pickup.');
});
