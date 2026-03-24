import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchRecommendations = async (topK = 10) => {
  const response = await api.get(`/api/recommendations?top_k=${topK}`);
  return response.data;
};

export const fetchActiveNakas = async () => {
  const response = await api.get('/api/naka/active');
  return response.data;
};

export const updateNakaStatus = async (data) => {
  const response = await api.post('/api/naka/update', data);
  return response.data;
};

export const fetchEDASummary = async () => {
  const response = await api.get('/api/eda/summary');
  return response.data;
};

export const fetchViolations = async () => {
  const response = await api.get('/api/simulate/violations');
  return response.data;
};

export const ingestViolation = async (violation) => {
  const response = await api.post('/api/ingest', violation);
  return response.data;
};

export default api;
