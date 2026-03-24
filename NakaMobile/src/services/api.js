import axios from 'axios';
import {
  generateMockRecommendations,
  generateMockActiveNakas,
  generateMockBlockades,
  generateMockStats,
  generateMockIncident,
} from './mockData';

// Update this to your machine's IP when running on a physical device
// e.g. 'http://192.168.1.100:8000' for local network
export const API_BASE_URL = 'http://10.0.2.2:8000'; // Android emulator localhost

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Helper: fallback to mock on error ───────────────────────────────────────
async function safeFetch(fn, mockFn) {
  try {
    return await fn();
  } catch (e) {
    console.warn('[API] Backend unavailable, using mock data:', e.message);
    return mockFn();
  }
}

// ─── Recommendations ──────────────────────────────────────────────────────────
export const fetchRecommendations = async (topK = 10) =>
  safeFetch(
    async () => {
      const res = await api.get(`/api/recommendations?top_k=${topK}`);
      return res.data;
    },
    () => ({ recommendations: generateMockRecommendations(topK) })
  );

// ─── Active Nakas ─────────────────────────────────────────────────────────────
export const fetchActiveNakas = async () =>
  safeFetch(
    async () => {
      const res = await api.get('/api/naka/active');
      return res.data;
    },
    () => ({ active_nakas: generateMockActiveNakas() })
  );

// ─── Update Naka Status ───────────────────────────────────────────────────────
export const updateNakaStatus = async (data) =>
  safeFetch(
    async () => {
      const res = await api.post('/api/naka/update', data);
      return res.data;
    },
    () => ({ success: true, ...data })
  );

// ─── Blockades ────────────────────────────────────────────────────────────────
export const fetchBlockades = async () =>
  safeFetch(
    async () => {
      const res = await api.get('/api/blockades');
      return res.data;
    },
    () => ({ blockades: generateMockBlockades() })
  );

export const createBlockade = async (data) =>
  safeFetch(
    async () => {
      const res = await api.post('/api/blockades', data);
      return res.data;
    },
    () => ({ success: true, blockade: { id: `BLK-${Date.now()}`, ...data, createdAt: new Date().toISOString() } })
  );

export const updateBlockade = async (id, data) =>
  safeFetch(
    async () => {
      const res = await api.put(`/api/blockades/${id}`, data);
      return res.data;
    },
    () => ({ success: true, id, ...data, updatedAt: new Date().toISOString() })
  );

export const deleteBlockade = async (id) =>
  safeFetch(
    async () => {
      const res = await api.delete(`/api/blockades/${id}`);
      return res.data;
    },
    () => ({ success: true, id })
  );

// ─── Incidents / Violations ───────────────────────────────────────────────────
export const fetchViolations = async (limit = 20) =>
  safeFetch(
    async () => {
      const res = await api.get(`/api/simulate/violations?limit=${limit}`);
      return res.data;
    },
    () => {
      const violations = Array.from({ length: limit }, () => generateMockIncident());
      return { violations };
    }
  );

export const ingestViolation = async (violation) =>
  safeFetch(
    async () => {
      const res = await api.post('/api/ingest', violation);
      return res.data;
    },
    () => ({ success: true, id: `INC-${Date.now()}`, ...violation })
  );

// ─── Stats ────────────────────────────────────────────────────────────────────
export const fetchEDASummary = async () =>
  safeFetch(
    async () => {
      const res = await api.get('/api/eda/summary');
      return res.data;
    },
    () => ({ summary: generateMockStats() })
  );

export const fetchModelStatus = async () =>
  safeFetch(
    async () => {
      const res = await api.get('/model/status');
      return res.data;
    },
    () => ({
      status: 'ready',
      version: '2.1.0',
      accuracy: 0.873,
      last_trained: new Date(Date.now() - 3600000 * 6).toISOString(),
      drift_psi: 0.08,
    })
  );

export const fetchClusters = async () =>
  safeFetch(
    async () => {
      const res = await api.get('/clusters');
      return res.data;
    },
    () => ({ clusters: [] })
  );

export default api;
