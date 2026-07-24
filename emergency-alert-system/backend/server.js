/**
 * Smart Emergency Vehicle Intersection Alert System - Backend
 * 
 * Express server with native WebSocket (ws) that:
 * - Serves the frontend dashboard
 * - Receives GPS data from emergency vehicle senders
 * - Calculates ETA, approach direction, and exit direction
 * - Broadcasts updates to all connected receiver displays
 * - Includes a built-in simulation mode for demo
 */

const express = require('express');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// Serve the frontend from frontend/public/
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// --- Configuration ---

// Intersection location (the display unit location)
const INTERSECTION = {
  id: 'INT-001',
  name: 'Main St & Broadway',
  lat: 40.7128,
  lng: -74.0060
};

// Show alerts when vehicle is within this distance (meters)
const ALERT_RADIUS = 3000;
// Duration to show "PASSING" before clearing (ms)
const PASSING_DURATION = 5000;

// --- State ---

// Connected receiver clients (browser dashboards)
let receivers = new Set();
// Current active vehicle data (null if none)
let activeVehicle = null;
// Timer for the "passing" state
let passingTimer = null;

// --- Simulation Config ---
// Vehicle starts ~1.6km south, heads north through the intersection
const SIM = {
  startLat: 40.6980,
  startLng: -74.0060,
  destLat: 40.7228,
  destLng: -74.0060,
  speedMs: 15,       // ~54 km/h typical city speed
  totalSteps: 80,    // 80 steps x 2s = 160s total run
  intervalMs: 2000
};
let simInterval = null;
let simStep = 0;

// --- Utility Functions ---

/** Haversine formula: returns distance in meters between two GPS points */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (d) => d * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Bearing from (lat1,lng1) to (lat2,lng2) in degrees. 0=N, 90=E, 180=S, 270=W */
function bearing(lat1, lng1, lat2, lng2) {
  const toRad = (d) => d * (Math.PI / 180);
  const toDeg = (r) => r * (180 / Math.PI);
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Convert bearing (degrees) to cardinal direction: North/South/East/West */
function toCardinal(deg) {
  if (deg >= 315 || deg < 45)  return 'North';
  if (deg >= 45  && deg < 135) return 'East';
  if (deg >= 135 && deg < 225) return 'South';
  return 'West';
}

/** Return opposite cardinal direction */
function oppositeCardinal(dir) {
  const map = { North: 'South', South: 'North', East: 'West', West: 'East' };
  return map[dir] || dir;
}

// --- Core Logic ---

/** Process incoming vehicle GPS data and broadcast to all receivers */
function processVehicleUpdate(data) {
  const { lat, lng, speed, destination, timestamp } = data;
  const distance = haversineDistance(lat, lng, INTERSECTION.lat, INTERSECTION.lng);

  // Only alert if within radius
  if (distance > ALERT_RADIUS) {
    clearVehicle();
    return;
  }

  // Approach direction: bearing FROM vehicle TO intersection
  const approachBearing = bearing(lat, lng, INTERSECTION.lat, INTERSECTION.lng);
  const approachDirection = toCardinal(approachBearing);

  // Exit direction: bearing FROM intersection TO destination
  let exitDirection = oppositeCardinal(approachDirection);
  if (destination && destination.lat != null && destination.lng != null) {
    const exitBearing = bearing(INTERSECTION.lat, INTERSECTION.lng, destination.lat, destination.lng);
    exitDirection = toCardinal(exitBearing);
  }

  // ETA in seconds
  const speedMs = Math.max(speed || 0.1, 0.1);
  const etaSeconds = Math.max(0, Math.round(distance / speedMs));
  const status = etaSeconds <= 0 ? 'passing' : 'approaching';

  activeVehicle = {
    lat, lng, speed, distance, etaSeconds,
    approachDirection, exitDirection, status,
    timestamp: timestamp || Date.now()
  };

  // When vehicle arrives, schedule clear after PASSING_DURATION
  if (status === 'passing' && !passingTimer) {
    passingTimer = setTimeout(() => {
      clearVehicle();
    }, PASSING_DURATION);
  }

  broadcastToReceivers({
    type: 'vehicle-update',
    status,
    vehicle: activeVehicle,
    intersection: { id: INTERSECTION.id, name: INTERSECTION.name }
  });
}

/** Clear the active vehicle and notify receivers */
function clearVehicle() {
  activeVehicle = null;
  if (passingTimer) {
    clearTimeout(passingTimer);
    passingTimer = null;
  }
  broadcastToReceivers({ type: 'vehicle-update', status: 'clear' });
}

/** Send a JSON message to all connected receiver (browser) clients */
function broadcastToReceivers(data) {
  const msg = JSON.stringify(data);
  for (const ws of receivers) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

// --- Simulation ---

function simulationTick() {
  const p = simStep / SIM.totalSteps;
  const lat = SIM.startLat + (SIM.destLat - SIM.startLat) * p;
  const lng = SIM.startLng + (SIM.destLng - SIM.startLng) * p;

  processVehicleUpdate({
    lat, lng,
    speed: SIM.speedMs,
    destination: { lat: SIM.destLat, lng: SIM.destLng },
    timestamp: Date.now()
  });

  simStep++;
  if (simStep > SIM.totalSteps) {
    stopSimulation();
  }
}

function startSimulation() {
  if (simInterval) stopSimulation();
  simStep = 0;
  activeVehicle = null;
  passingTimer = null;

  simInterval = setInterval(simulationTick, SIM.intervalMs);
  simulationTick(); // first update immediately

  broadcastToReceivers({ type: 'sim-status', running: true });
  console.log('[SIM] Started - vehicle approaching from South, heading North');
}

function stopSimulation() {
  if (simInterval) {
    clearInterval(simInterval);
    simInterval = null;
  }
  simStep = 0;
  activeVehicle = null;
  passingTimer = null;

  broadcastToReceivers({ type: 'sim-status', running: false });
  broadcastToReceivers({ type: 'vehicle-update', status: 'clear' });
  console.log('[SIM] Stopped');
}

// --- WebSocket Handling ---

wss.on('connection', (ws) => {
  console.log('[WS] Client connected');
  receivers.add(ws);

  // Send current state immediately
  if (activeVehicle) {
    ws.send(JSON.stringify({
      type: 'vehicle-update',
      status: activeVehicle.status,
      vehicle: activeVehicle,
      intersection: { id: INTERSECTION.id, name: INTERSECTION.name }
    }));
  } else {
    ws.send(JSON.stringify({ type: 'vehicle-update', status: 'clear' }));
  }
  ws.send(JSON.stringify({ type: 'sim-status', running: !!simInterval }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      // Sender: incoming GPS from emergency vehicle
      if (msg.type === 'vehicle-gps') {
        processVehicleUpdate(msg.data);
      }

      // Demo controls from the dashboard
      if (msg.type === 'start-demo') startSimulation();
      if (msg.type === 'stop-demo') stopSimulation();

    } catch (e) {
      // ignore malformed messages
    }
  });

  ws.on('close', () => {
    console.log('[WS] Client disconnected');
    receivers.delete(ws);
  });
});

// --- REST Endpoints ---

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', intersection: INTERSECTION, receivers: receivers.size });
});

// Accept GPS data via REST (alternative to WebSocket for senders)
app.post('/api/vehicle/gps', (req, res) => {
  processVehicleUpdate(req.body);
  res.json({ ok: true });
});

app.post('/api/demo/start', (req, res) => { startSimulation(); res.json({ started: true }); });
app.post('/api/demo/stop', (req, res) => { stopSimulation(); res.json({ stopped: true }); });

// --- Start Server ---

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  Emergency Vehicle Alert System');
  console.log('  Server: http://localhost:' + PORT);
  console.log('  Intersection: ' + INTERSECTION.name);\n  console.log('  Position: ' + INTERSECTION.lat + ', ' + INTERSECTION.lng);\n  console.log('========================================');
  console.log('');
});
