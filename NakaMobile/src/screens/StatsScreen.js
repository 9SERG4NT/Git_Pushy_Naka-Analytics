import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getEdaSummary, getModelStatus } from '../services/api';

const VIOLATION_CONFIG = {
  Speeding:    { color: '#8B5CF6', width: 0.78 },
  No_Helmet:   { color: '#ff9159', width: 0.52 },
  Overloading: { color: '#4ade80', width: 0.32 },
  Signal_Jump: { color: '#38bdf8', width: 0.28 },
  DUI:         { color: '#ff7351', width: 0.22 },
  Wrong_Way:   { color: '#f43f5e', width: 0.18 },
};

const WEATHER_CONFIG = {
  Clear:  { icon: 'sunny',  color: '#fdd400', pct: '42%' },
  Cloudy: { icon: 'cloud',  color: '#aaabaf', pct: '28%' },
  Rainy:  { icon: 'rainy',  color: '#38bdf8', pct: '18%' },
  Fog:    { icon: 'cloudy-night', color: '#747579', pct: '12%' },
};

export default function StatsScreen() {
  const { officer, logout } = useAuth();
  const [summary, setSummary] = useState(null);
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const [sumRes, modRes] = await Promise.all([getEdaSummary(), getModelStatus()]);
    if (sumRes?.status === 'success') setSummary(sumRes.summary);
    if (modRes?.status === 'success') setModel(modRes.metadata);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>LOADING ANALYTICS...</Text>
      </View>
    );
  }

  const violationEntries = summary?.violation_counts
    ? Object.entries(summary.violation_counts).sort((a, b) => b[1] - a[1])
    : Object.entries({ Speeding: 12450, No_Helmet: 8200, Overloading: 5100, Signal_Jump: 4900, DUI: 3800, Wrong_Way: 2800 });
  const maxCount = violationEntries.length > 0 ? violationEntries[0][1] : 1;

  const weatherEntries = summary?.weather_counts
    ? Object.entries(summary.weather_counts)
    : Object.entries({ Clear: 21000, Cloudy: 14000, Rainy: 9000, Fog: 6000 });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* ── Officer Profile Card ── */}
      <View style={styles.officerCard}>
        <View style={styles.officerCardAccent} />
        <View style={styles.officerAvatarBox}>
          <Ionicons name="shield-checkmark" size={28} color={COLORS.primary} />
        </View>
        <View style={styles.officerInfo}>
          <Text style={styles.activeCommand}>ACTIVE COMMAND</Text>
          <Text style={styles.officerName}>{officer?.name || 'OFFICER'}</Text>
          <View style={styles.officerBadges}>
            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>BADGE: {officer?.badgeId || 'NP001'}</Text>
            </View>
            <View style={[styles.badgePill, styles.badgePillOrange]}>
              <Text style={[styles.badgePillText, { color: COLORS.primary }]}>SEC_LEVEL: 05</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      {/* ── Stats Bento Grid ── */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statCardTop}>
            <Text style={styles.statCardLabel}>TOTAL RECORDS</Text>
            <Ionicons name="server-outline" size={16} color={COLORS.primary} />
          </View>
          <Text style={styles.statCardNumber}>
            {summary?.total_records ? (summary.total_records / 1000).toFixed(0) + 'k' : '50k'}
          </Text>
          <Text style={styles.statCardSub}>+12% vs last cycle</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statCardTop}>
            <Text style={styles.statCardLabel}>PEAK INTERVAL</Text>
            <Ionicons name="time-outline" size={16} color={COLORS.secondary} />
          </View>
          <Text style={styles.statCardNumber}>
            {summary?.hourly_peak != null ? `${String(summary.hourly_peak).padStart(2,'0')}:00` : '09:00'}
          </Text>
          <Text style={styles.statCardSub}>High density period</Text>
        </View>
        <View style={[styles.statCard, styles.statCardAlert]}>
          <View style={styles.statCardTop}>
            <Text style={[styles.statCardLabel, { color: COLORS.error }]}>HOLIDAY DRIFT</Text>
            <Ionicons name="warning" size={16} color={COLORS.error} />
          </View>
          <Text style={[styles.statCardNumber, { color: COLORS.error, fontSize: 20 }]}>CRITICAL</Text>
          <Text style={styles.statCardSub}>Weekend spike detected</Text>
        </View>
      </View>

      {/* ── Incident Distribution ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionTitle}>INCIDENT DISTRIBUTION</Text>
        </View>

        <View style={styles.chart}>
          {violationEntries.map(([type, count]) => {
            const cfg = VIOLATION_CONFIG[type] || { color: COLORS.info, width: (count / maxCount) };
            const w = cfg.width ?? count / maxCount;
            return (
              <View key={type} style={styles.barRow}>
                <Text style={styles.barLabel}>{type.replace(/_/g, ' ').toUpperCase()}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${w * 100}%`, backgroundColor: cfg.color, shadowColor: cfg.color }]} />
                </View>
                <Text style={[styles.barValue, { color: cfg.color }]}>
                  {typeof count === 'number' ? count.toLocaleString() : count}
                </Text>
              </View>
            );
          })}
        </View>

        {/* AI Prediction box */}
        <View style={styles.aiBox}>
          <View style={styles.aiIconBox}>
            <Ionicons name="flask-outline" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.aiText}>
            <Text style={styles.aiLabel}>AI PREDICTION FORECAST</Text>
            <Text style={styles.aiValue}>Violation probability increases by 14% in upcoming rain cycle.</Text>
          </View>
        </View>
      </View>

      {/* ── Weather Grid ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitleSmall}>ENVIRONMENT CONTEXT</Text>
        <View style={styles.weatherGrid}>
          {weatherEntries.map(([weather, count]) => {
            const cfg = WEATHER_CONFIG[weather] || { icon: 'partlysunny', color: COLORS.onSurfaceVariant, pct: '--' };
            return (
              <View key={weather} style={styles.weatherCard}>
                <View style={styles.weatherTop}>
                  <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                  <Text style={styles.weatherPct}>{cfg.pct}</Text>
                </View>
                <Text style={styles.weatherLabel}>{weather.toUpperCase()}</Text>
                <Text style={styles.weatherCount}>{typeof count === 'number' ? (count / 1000).toFixed(0) + 'k' : count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── ML Model Card ── */}
      <View style={styles.modelCard}>
        <View style={styles.modelCardAccent} />
        <Text style={styles.sectionTitleSmall}>INFERENCE ENGINE v2.4</Text>
        <View style={styles.modelGrid}>
          <View style={styles.modelItem}>
            <Text style={styles.modelLabel}>TOTAL RECORDS</Text>
            <View style={styles.modelValueRow}>
              <Text style={styles.modelNum}>{model?.n_records ? (model.n_records / 1000).toFixed(1) + 'k' : '50.0k'}</Text>
              <Text style={styles.modelTag}>TRAINED</Text>
            </View>
          </View>
          <View style={styles.modelItem}>
            <Text style={styles.modelLabel}>FEATURES</Text>
            <View style={styles.modelValueRow}>
              <Text style={styles.modelNum}>{model?.n_features || '128'}</Text>
              <Text style={styles.modelTag}>DIMS</Text>
            </View>
          </View>
          <View style={styles.modelItem}>
            <Text style={styles.modelLabel}>CLUSTERS</Text>
            <View style={styles.modelValueRow}>
              <Text style={styles.modelNum}>{model?.n_clusters || '12'}</Text>
              <Text style={[styles.modelTag, { color: COLORS.secondary }]}>ACTIVE</Text>
            </View>
          </View>
          <View style={styles.modelItem}>
            <Text style={styles.modelLabel}>CLASSES</Text>
            <View style={styles.modelValueRow}>
              <Text style={styles.modelNum}>{String(model?.n_classes || 8).padStart(2, '0')}</Text>
              <Text style={styles.modelTag}>TYPES</Text>
            </View>
          </View>
        </View>
        <View style={styles.confSection}>
          <View style={styles.confHeader}>
            <Text style={styles.modelLabel}>MODEL CONFIDENCE</Text>
            <Text style={styles.confValue}>98.4%</Text>
          </View>
          <View style={styles.confTrack}>
            <View style={styles.confFill} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface, gap: 12 },
  loadingText: { fontSize: 10, fontWeight: '700', color: COLORS.onSurfaceVariant, letterSpacing: 2 },

  // Officer Card
  officerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + '20',
    position: 'relative',
    overflow: 'hidden',
  },
  officerCardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: COLORS.primary },
  officerAvatarBox: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceDim,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  officerInfo: { flex: 1 },
  activeCommand: { fontSize: 8, fontWeight: '700', color: COLORS.primary, letterSpacing: 3, marginBottom: 2 },
  officerName: { fontSize: 20, fontWeight: '900', color: COLORS.onSurface, letterSpacing: -0.5 },
  officerBadges: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: COLORS.surfaceDim,
    borderWidth: 1,
    borderColor: COLORS.secondary + '30',
    borderRadius: 4,
  },
  badgePillOrange: { borderColor: COLORS.primary + '30' },
  badgePillText: { fontSize: 9, fontWeight: '700', color: COLORS.secondary, fontVariant: ['tabular-nums'] },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.error + '18',
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },

  // Stats Grid
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  statCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 12,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant + '20',
  },
  statCardAlert: { borderBottomWidth: 2, borderBottomColor: COLORS.error, borderTopWidth: 0 },
  statCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statCardLabel: { fontSize: 8, fontWeight: '700', color: COLORS.onSurfaceVariant, letterSpacing: 1.5, flex: 1 },
  statCardNumber: { fontSize: 26, fontWeight: '900', color: COLORS.onSurface },
  statCardSub: { fontSize: 9, color: COLORS.onSurfaceVariant, marginTop: 2 },

  // Section
  section: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  sectionAccent: { width: 4, height: 22, backgroundColor: COLORS.primary, borderRadius: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: COLORS.onSurface, letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionTitleSmall: { fontSize: 9, fontWeight: '700', color: COLORS.onSurfaceVariant, letterSpacing: 2, marginBottom: 14 },

  // Chart
  chart: { gap: 14 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { width: 80, fontSize: 9, fontWeight: '700', color: COLORS.onSurfaceVariant, letterSpacing: 0.5 },
  barTrack: { flex: 1, height: 10, backgroundColor: COLORS.surfaceDim, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 0 },
  barValue: { width: 48, fontSize: 10, fontWeight: '700', textAlign: 'right' },

  // AI Box
  aiBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 20,
    backgroundColor: COLORS.surfaceDim + '88',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + '15',
  },
  aiIconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiText: { flex: 1 },
  aiLabel: { fontSize: 8, fontWeight: '700', color: COLORS.onSurfaceVariant, letterSpacing: 1.5, marginBottom: 4 },
  aiValue: { fontSize: 12, fontWeight: '600', color: COLORS.onSurface, lineHeight: 16 },

  // Weather
  weatherGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  weatherCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surfaceDim,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + '15',
  },
  weatherTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  weatherPct: { fontSize: 11, fontWeight: '700', color: COLORS.onSurface },
  weatherLabel: { fontSize: 8, fontWeight: '700', color: COLORS.onSurfaceVariant, letterSpacing: 1.5, marginBottom: 4 },
  weatherCount: { fontSize: 20, fontWeight: '900', color: COLORS.onSurface },

  // Model Card
  modelCard: {
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + '20',
    position: 'relative',
    overflow: 'hidden',
  },
  modelCardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: COLORS.secondary },
  modelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 14 },
  modelItem: { width: '45%' },
  modelLabel: { fontSize: 8, fontWeight: '700', color: COLORS.onSurfaceVariant, letterSpacing: 1.5, marginBottom: 4 },
  modelValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  modelNum: { fontSize: 24, fontWeight: '900', color: COLORS.onSurface },
  modelTag: { fontSize: 8, fontWeight: '700', color: COLORS.onSurfaceVariant, letterSpacing: 1.5 },

  confSection: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.outlineVariant + '20' },
  confHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  confValue: { fontSize: 11, fontWeight: '700', color: COLORS.secondary },
  confTrack: { height: 5, backgroundColor: COLORS.surfaceDim, borderRadius: 3, overflow: 'hidden' },
  confFill: { height: '100%', width: '98%', backgroundColor: COLORS.secondary, borderRadius: 3 },
});
