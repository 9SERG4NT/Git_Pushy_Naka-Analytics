// ─── Nagpur Violation Mock Data ───────────────────────────────────────────────
// Used as fallback when the backend is unavailable

const NAGPUR_ZONES = [
  { name: 'Sitabuldi', lat: 21.1458, lon: 79.0882, type: 'commercial' },
  { name: 'Dharampeth', lat: 21.1388, lon: 79.0625, type: 'residential' },
  { name: 'Civil Lines', lat: 21.1532, lon: 79.0764, type: 'government' },
  { name: 'Sadar', lat: 21.1587, lon: 79.0855, type: 'market' },
  { name: 'Itwari', lat: 21.1488, lon: 79.0948, type: 'market' },
  { name: 'Hingna', lat: 21.1163, lon: 78.9965, type: 'industrial' },
  { name: 'Kamptee', lat: 21.2195, lon: 79.1948, type: 'military' },
  { name: 'Wardha Road', lat: 21.0958, lon: 79.0567, type: 'highway' },
  { name: 'Amravati Road', lat: 21.1752, lon: 78.9876, type: 'highway' },
  { name: 'Koradi', lat: 21.2187, lon: 78.9762, type: 'industrial' },
  { name: 'Mankapur', lat: 21.1324, lon: 79.0456, type: 'college' },
  { name: 'Bajaj Nagar', lat: 21.1201, lon: 79.0624, type: 'residential' },
];

const VIOLATION_TYPES = ['DUI', 'No_Helmet', 'Speeding', 'Signal_Jump', 'Overloading', 'Wrong_Way'];
const VEHICLES = ['Two_Wheeler', 'Car', 'Auto', 'Truck', 'Bus'];
const WEATHERS = ['Clear', 'Cloudy', 'Rain', 'Fog'];

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randFloat(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(6));
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateMockIncident() {
  const zone = randItem(NAGPUR_ZONES);
  const type = randItem(VIOLATION_TYPES);
  return {
    id: `INC-${Date.now()}-${randInt(100, 999)}`,
    type,
    zone: zone.name,
    latitude: randFloat(zone.lat - 0.005, zone.lat + 0.005),
    longitude: randFloat(zone.lon - 0.005, zone.lon + 0.005),
    confidence: randFloat(0.55, 0.99),
    vehicle_class: randItem(VEHICLES),
    weather: randItem(WEATHERS),
    timestamp: new Date().toISOString(),
    severity: type === 'DUI' || type === 'Speeding' ? 'HIGH' : 'MEDIUM',
    status: 'reported',
  };
}

export function generateMockRecommendations(count = 10) {
  return NAGPUR_ZONES.slice(0, count).map((zone, i) => ({
    id: `REC-${i}`,
    cluster_id: i,
    zone: zone.name,
    latitude: zone.lat,
    longitude: zone.lon,
    title: zone.name,
    confidence: randFloat(0.65, 0.97),
    expectedYield: randInt(3, 18),
    time_window: 'Next 2 hours',
    violation_type: randItem(VIOLATION_TYPES),
    priority: i < 3 ? 'HIGH' : i < 7 ? 'MEDIUM' : 'LOW',
  }));
}

export function generateMockActiveNakas() {
  return [
    {
      id: 'NAKA-001',
      officer_name: 'Insp. Sharma',
      badge: 'OFF001',
      latitude: 21.1458,
      longitude: 79.0882,
      status: 'active',
      zone: 'Sitabuldi',
      activatedAt: new Date(Date.now() - 3600000).toISOString(),
      violations_caught: randInt(2, 12),
    },
    {
      id: 'NAKA-002',
      officer_name: 'SC Patil',
      badge: 'OFF002',
      latitude: 21.1532,
      longitude: 79.0764,
      status: 'active',
      zone: 'Civil Lines',
      activatedAt: new Date(Date.now() - 7200000).toISOString(),
      violations_caught: randInt(0, 8),
    },
  ];
}

export function generateMockBlockades() {
  return [
    {
      id: 'BLK-001',
      name: 'Sitabuldi Junction',
      latitude: 21.1458,
      longitude: 79.0882,
      status: 'active',
      type: 'checkpoint',
      officer_badge: 'OFF001',
      officer_name: 'Insp. Sharma',
      zone: 'Sitabuldi',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'High DUI zone after 10PM',
    },
    {
      id: 'BLK-002',
      name: 'Wardha Road Entry',
      latitude: 21.0958,
      longitude: 79.0567,
      status: 'active',
      type: 'speed_check',
      officer_badge: 'OFF003',
      officer_name: 'SC Deshmukh',
      zone: 'Wardha Road',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Speeding hotspot',
    },
    {
      id: 'BLK-003',
      name: 'Dharampeth Circle',
      latitude: 21.1388,
      longitude: 79.0625,
      status: 'inactive',
      type: 'checkpoint',
      officer_badge: 'OFF004',
      officer_name: 'HC Wankhede',
      zone: 'Dharampeth',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      notes: 'Helmet check zone near colleges',
    },
  ];
}

export function generateMockStats() {
  return {
    total_records: 52847,
    hourly_peak: 8,
    weekend_violations: 14523,
    holiday_violations: 3892,
    today_violations: randInt(80, 250),
    active_nakas: 2,
    model_accuracy: 0.87,
    violation_counts: {
      DUI: 8432,
      No_Helmet: 15249,
      Speeding: 12087,
      Signal_Jump: 9823,
      Overloading: 4512,
      Wrong_Way: 2744,
    },
    geo_bounds: {
      lat_min: 21.05,
      lat_max: 21.25,
      lon_min: 78.95,
      lon_max: 79.15,
    },
    date_range: {
      start: '2024-01-01T00:00:00',
      end: new Date().toISOString(),
    },
    top_zones: NAGPUR_ZONES.slice(0, 5).map((z) => ({
      zone: z.name,
      count: randInt(500, 3000),
    })),
  };
}
