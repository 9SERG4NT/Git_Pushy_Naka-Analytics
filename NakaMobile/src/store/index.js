import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  isAuthenticated: false,
  officer: null,
  login: (badgeId, pin) => {
    set({
      isAuthenticated: true,
      officer: {
        badgeId,
        name: badgeId === 'OFF001' ? 'Inspector Sharma' : 'Officer',
      },
    });
  },
  logout: () => set({ isAuthenticated: false, officer: null }),
}));

export const useNakaStore = create((set) => ({
  recommendations: [],
  activeNakas: [],
  currentNaka: null,
  setRecommendations: (recommendations) => set({ recommendations }),
  setActiveNakas: (activeNakas) => set({ activeNakas }),
  setCurrentNaka: (currentNaka) => set({ currentNaka }),
}));

export const useAlertsStore = create((set) => ({
  alerts: [],
  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts].slice(0, 50) })),
  clearAlerts: () => set({ alerts: [] }),
}));

export const useStatsStore = create((set) => ({
  stats: null,
  setStats: (stats) => set({ stats }),
}));
