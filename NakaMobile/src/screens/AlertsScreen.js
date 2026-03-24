import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { getSimulatedViolations } from '../services/api';

const VIOLATION_CONFIG = {
  DUI:         { color: '#ff7351', icon: 'wine',        priority: 'HIGH' },
  No_Helmet:   { color: '#ff9159', icon: 'bicycle',     priority: 'MED'  },
  Speeding:    { color: '#8B5CF6', icon: 'speedometer', priority: 'HIGH' },
  Signal_Jump: { color: '#38bdf8', icon: 'warning',     priority: 'MED'  },
  Overloading: { color: '#4ade80', icon: 'car',         priority: 'LOW'  },
  Wrong_Way:   { color: '#f43f5e', icon: 'arrow-undo',  priority: 'HIGH' },
};

const PRIORITY_COLOR = { HIGH: '#ff7351', MED: '#ff9159', LOW: '#4ade80' };

export default function AlertsScreen() {
  const [violations, setViolations] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchViolations = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    const res = await getSimulatedViolations();
    if (res?.status === 'success') {
      setViolations((prev) => [...(res.violations || []), ...prev].slice(0, 60));
      setHotspots(res.hotspot_zones || []);
    } else {
      if (violations.length === 0) setError('FEED OFFLINE');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchViolations();
    const interval = setInterval(() => fetchViolations(false), 10000);
    return () => clearInterval(interval);
  }, [fetchViolations]);

  const onRefresh = () => { setRefreshing(true); fetchViolations(); };

  const renderViolation = ({ item, index }) => {
    const cfg = VIOLATION_CONFIG[item.type] || { color: COLORS.info, icon: 'alert-circle', priority: 'MED' };
    const isHigh = (item.confidence || 0) > 0.85;
    let time = 'NOW';
    try {
      if (item.timestamp) time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {}

    return (
      <View style={[styles.card, index === 0 && styles.cardFirst, isHigh && styles.cardHigh]}>
        {/* Left border accent */}
        <View style={[styles.cardAccent, { backgroundColor: cfg.color }]} />

        <View style={[styles.iconBox, { backgroundColor: cfg.color + '18' }]}>
          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <Text style={styles.cardType}>{(item.type || 'UNKNOWN').replace(/_/g, ' ')}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLOR[cfg.priority] + '22', borderColor: PRIORITY_COLOR[cfg.priority] + '55' }]}>
              <Text style={[styles.priorityText, { color: PRIORITY_COLOR[cfg.priority] }]}>{cfg.priority}</Text>
            </View>
          </View>
          <Text style={styles.cardZone}>{item.zone || 'UNKNOWN ZONE'}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardConf}>{((item.confidence || 0) * 100).toFixed(0)}% CONFIDENCE</Text>
            <Text style={styles.cardTime}>{time}</Text>
          </View>
        </View>

        {item.vehicle_class && (
          <View style={styles.vehicleBadge}>
            <Text style={styles.vehicleText}>{item.vehicle_class}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>CONNECTING TO VIOLATION FEED...</Text>
      </View>
    );
  }

  if (error && violations.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning" size={48} color={COLORS.error} />
        <Text style={styles.errorTitle}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchViolations()}>
          <Ionicons name="refresh" size={16} color={COLORS.onPrimary} />
          <Text style={styles.retryText}>RECONNECT</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Hotspot Banner */}
      {hotspots.length > 0 && (
        <View style={styles.hotspotBanner}>
          <Ionicons name="flame" size={14} color={COLORS.error} />
          <Text style={styles.hotspotLabel}>ACTIVE HOTSPOTS:</Text>
          <Text style={styles.hotspotZones}>{hotspots.join(' · ')}</Text>
        </View>
      )}

      <FlatList
        data={violations}
        keyExtractor={(item, index) => `v-${index}-${item.type}`}
        renderItem={renderViolation}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
        ListHeaderComponent={
          violations.length > 0 ? (
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>{violations.length} INCIDENTS DETECTED</Text>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
            <Text style={styles.emptyText}>NO VIOLATIONS DETECTED</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh feed</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface, gap: 12 },
  loadingText: { fontSize: 10, fontWeight: '700', color: COLORS.onSurfaceVariant, letterSpacing: 2 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface, gap: 14, padding: 24 },
  errorTitle: { fontSize: 14, fontWeight: '900', color: COLORS.error, letterSpacing: 2 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  retryText: { fontSize: 12, fontWeight: '700', color: COLORS.onPrimary, letterSpacing: 1.5 },

  hotspotBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.errorContainer + '22',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.error + '30',
    flexWrap: 'wrap',
  },
  hotspotLabel: { fontSize: 9, fontWeight: '700', color: COLORS.error, letterSpacing: 1.5 },
  hotspotZones: { fontSize: 10, color: COLORS.onSurface, fontWeight: '600', flex: 1 },

  list: { padding: 14, paddingBottom: 40 },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + '20',
  },
  listHeaderText: { fontSize: 10, fontWeight: '700', color: COLORS.onSurfaceVariant, letterSpacing: 1.5 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.error + '22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error + '44',
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.error },
  liveText: { fontSize: 8, fontWeight: '900', color: COLORS.error, letterSpacing: 2 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + '15',
  },
  cardFirst: { borderColor: COLORS.primary + '33' },
  cardHigh: { borderColor: COLORS.error + '44', backgroundColor: COLORS.error + '08' },
  cardAccent: { width: 3, alignSelf: 'stretch' },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 12,
    marginRight: 8,
  },
  cardContent: { flex: 1, paddingVertical: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardType: { fontSize: 13, fontWeight: '700', color: COLORS.onSurface, letterSpacing: 0.5, flex: 1 },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  priorityText: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  cardZone: { fontSize: 11, color: COLORS.onSurfaceVariant, marginBottom: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardConf: { fontSize: 10, color: COLORS.onSurfaceVariant, fontWeight: '600' },
  cardTime: { fontSize: 10, color: COLORS.outlineVariant },
  vehicleBadge: {
    backgroundColor: COLORS.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 4,
    margin: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + '30',
  },
  vehicleText: { fontSize: 10, color: COLORS.onSurfaceVariant, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 12, fontWeight: '700', color: COLORS.onSurfaceVariant, letterSpacing: 2 },
  emptySubtext: { fontSize: 11, color: COLORS.outlineVariant },
});
