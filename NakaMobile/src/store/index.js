import { create } from 'zustand';

// ─── Officer / Session Store (no login required) ────────────────────────────
export const useOfficerStore = create((set) => ({
  officer: {
    badgeId: 'OFF001',
    name: 'Inspector Sharma',
    zone: 'Central Nagpur',
    rank: 'Inspector',
  },
  setOfficer: (officer) => set({ officer }),
}));

// ─── Naka / Recommendations Store ───────────────────────────────────────────
export const useNakaStore = create((set) => ({
  recommendations: [],
  activeNakas: [],
  currentNaka: null,
  isLoading: false,
  lastUpdated: null,
  setRecommendations: (recommendations) => set({ recommendations, lastUpdated: new Date().toISOString() }),
  setActiveNakas: (activeNakas) => set({ activeNakas }),
  setCurrentNaka: (currentNaka) => set({ currentNaka }),
  setLoading: (isLoading) => set({ isLoading }),
  clearCurrentNaka: () => set({ currentNaka: null }),
}));

// ─── Blockade Store ──────────────────────────────────────────────────────────
export const useBlockadeStore = create((set, get) => ({
  blockades: [],
  activeCount: 0,
  isLoading: false,
  setBlockades: (blockades) =>
    set({ blockades, activeCount: blockades.filter((b) => b.status === 'active').length }),
  addBlockade: (blockade) =>
    set((state) => {
      const updated = [...state.blockades, blockade];
      return { blockades: updated, activeCount: updated.filter((b) => b.status === 'active').length };
    }),
  updateBlockadeStatus: (id, status) =>
    set((state) => {
      const blockades = state.blockades.map((b) =>
        b.id === id ? { ...b, status, updatedAt: new Date().toISOString() } : b
      );
      return { blockades, activeCount: blockades.filter((b) => b.status === 'active').length };
    }),
  removeBlockade: (id) =>
    set((state) => {
      const blockades = state.blockades.filter((b) => b.id !== id);
      return { blockades, activeCount: blockades.filter((b) => b.status === 'active').length };
    }),
  setLoading: (isLoading) => set({ isLoading }),
}));

// ─── Incidents / Alerts Store ────────────────────────────────────────────────
export const useIncidentStore = create((set) => ({
  incidents: [],
  unreadCount: 0,
  addIncident: (incident) =>
    set((state) => ({
      incidents: [incident, ...state.incidents].slice(0, 100),
      unreadCount: state.unreadCount + 1,
    })),
  setIncidents: (incidents) => set({ incidents, unreadCount: 0 }),
  markAllRead: () => set({ unreadCount: 0 }),
  clearIncidents: () => set({ incidents: [], unreadCount: 0 }),
}));

// ─── Stats Store ─────────────────────────────────────────────────────────────
export const useStatsStore = create((set) => ({
  stats: null,
  modelStatus: null,
  setStats: (stats) => set({ stats }),
  setModelStatus: (modelStatus) => set({ modelStatus }),
}));

// ─── WebSocket / Connection Store ────────────────────────────────────────────
export const useConnectionStore = create((set) => ({
  isConnected: false,
  lastHeartbeat: null,
  setConnected: (isConnected) => set({ isConnected }),
  setHeartbeat: () => set({ lastHeartbeat: new Date().toISOString() }),
}));
