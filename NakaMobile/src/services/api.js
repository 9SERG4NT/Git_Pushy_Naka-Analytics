import axios from 'axios';
import { API_BASE_URL } from '../constants/theme';

const DEBUG = true;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    if (DEBUG) console.log(`API: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('API Error:', error.message);
    return Promise.reject(error);
  }
);

// ---- Auth ----
export const loginOfficer = async (badgeId, pin) => {
  try {
    const res = await api.post('/api/auth/login', { badge_id: badgeId, pin });
    return res.data;
  } catch (e) {
    return { status: 'error', message: 'Network error. Check server connection.' };
  }
};

// ---- Sync ----
export const getSyncState = async () => {
  try {
    const res = await api.get('/api/sync/state');
    return res.data;
  } catch (e) {
    return { status: 'error', violations: [], active_nakas: [], officers: [], recent_activity: [], violation_count: 0, naka_count: 0, officer_count: 0 };
  }
};

// ---- Recommendations ----
export const getRecommendations = async (topK = 10) => {
  try {
    const res = await api.get(`/api/recommendations?top_k=${topK}`);
    return res.data;
  } catch (e) {
    return { status: 'error', recommendations: [] };
  }
};

export const getClusters = async () => {
  try {
    const res = await api.get('/api/clusters');
    return res.data;
  } catch (e) {
    return { status: 'error', clusters: [] };
  }
};

// ---- Violations ----
export const getSimulatedViolations = async () => {
  try {
    const res = await api.get('/api/simulate/violations');
    return res.data;
  } catch (e) {
    return { status: 'error', violations: [], hotspot_zones: [] };
  }
};

// ---- Nakas ----
export const updateNakaStatus = async (officerId, officerName, latitude, longitude, status = 'active') => {
  try {
    const res = await api.post('/api/naka/update', {
      officer_id: officerId,
      officer_name: officerName,
      latitude,
      longitude,
      status,
    });
    return res.data;
  } catch (e) {
    return { status: 'error', message: 'Could not update naka status.' };
  }
};

export const getActiveNakas = async () => {
  try {
    const res = await api.get('/api/naka/active');
    return res.data;
  } catch (e) {
    return { status: 'error', active_nakas: [] };
  }
};

// ---- Stats ----
export const getEdaSummary = async () => {
  try {
    const res = await api.get('/api/eda/summary');
    return res.data;
  } catch (e) {
    return { status: 'error' };
  }
};

export const getModelStatus = async () => {
  try {
    const res = await api.get('/api/model/status');
    return res.data;
  } catch (e) {
    return { status: 'error' };
  }
};

export default api;
