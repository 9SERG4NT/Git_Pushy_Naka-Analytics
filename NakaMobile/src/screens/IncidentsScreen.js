import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  COLORS, Badge, Card, ConnectionBadge, SeverityBadge, ViolationIcon, VIOLATION_ICONS,
} from '../components';
import { useIncidentStore, useConnectionStore } from '../store';
import { wsService } from '../services/websocket';
import { fetchViolations } from '../services/api';

export default function IncidentsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const { incidents, addIncident, setIncidents, markAllRead, unreadCount } = useIncidentStore();
  const isConnected = useConnectionStore((s) => s.isConnected);

  const FILTERS = ['ALL', 'DUI', 'No_Helmet', 'Speeding', 'Signal_Jump', 'Overloading', 'Wrong_Way'];

  useEffect(() => {
    loadViolations();
    const unsub = wsService.subscribe((data) => {
      if (data.type === 'violation_event') {
        addIncident({ ...data.data, receivedAt: new Date().toISOString() });
        if (data.data.confidence > 0.85) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    });
    const interval = setInterval(loadViolations, 20000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  useEffect(() => { markAllRead(); }, []);

  const loadViolations = useCallback(async () => {
    try {
      const res = await fetchViolations(30);
      if (res?.violations) {
        setIncidents(res.violations.map((v) => ({ ...v, receivedAt: v.receivedAt || new Date().toISOString() })));
      }
    } catch (e) { console.error('loadViolations:', e); }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadViolations();
    setRefreshing(false);
  };

  const filtered = filter === 'ALL' ? incidents : incidents.filter((i) => i.type === filter);

  const getConfColor = (c) => (c > 0.85 ? COLORS.dangerLight : c > 0.70 ? COLORS.warning : COLORS.primaryLight);

  const renderIncident = ({ item }) => {
    const isHigh = item.confidence > 0.85;
    return (
      <Card style={[styles.incidentCard, isHigh && styles.highCard]}>
        <View style={styles.incidentTop}>
          <View style={styles.incidentLeft}>
            <ViolationIcon type={item.type} size={28} />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.incidentType}>{item.type?.replace('_', ' ')}</Text>
              <Text style={styles.incidentZone}>📍 {item.zone}</Text>
            </View>
          </View>
          <View style={styles.incidentRight}>
            <Badge label={`${((item.confidence || 0) * 100).toFixed(0)}%`} color={getConfColor(item.confidence)} />
            <Text style={styles.incidentTime}>{new Date(item.timestamp || item.receivedAt).toLocaleTimeString()}</Text>
          </View>
        </View>

        <View style={styles.incidentDetails}>
          <View style={styles.detailChip}>
            <Text style={styles.detailText}>🚗 {item.vehicle_class}</Text>
          </View>
          <View style={styles.detailChip}>
            <Text style={styles.detailText}>🌤 {item.weather}</Text>
          </View>
          {item.severity && <SeverityBadge severity={item.severity} />}
        </View>

        {isHigh && (
          <View style={styles.highPriorityBanner}>
            <Text style={styles.highPriorityText}>⚠️ HIGH PRIORITY — Immediate response required</Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🚨 Live Incidents</Text>
          <Text style={styles.headerSub}>{incidents.length} events • auto-refresh 20s</Text>
        </View>
        <ConnectionBadge isConnected={isConnected} />
      </View>

      {/* Filter chips */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f) => f}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {VIOLATION_ICONS[f] || ''} {f.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Live counter banner */}
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.newBanner} onPress={markAllRead}>
          <Text style={styles.newBannerText}>🔴 {unreadCount} new incident{unreadCount > 1 ? 's' : ''} — tap to clear</Text>
        </TouchableOpacity>
      )}

      {/* Incidents list */}
      <FlatList
        data={filtered}
        keyExtractor={(item, idx) => `${item.id || item.timestamp}-${idx}`}
        renderItem={renderIncident}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📡</Text>
            <Text style={styles.emptyTitle}>Monitoring for violations...</Text>
            <Text style={styles.emptySub}>New incidents will appear here in real time</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  headerSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  filterContainer: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterList: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.accent },
  filterText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  filterTextActive: { color: COLORS.accent },
  newBanner: { backgroundColor: `${COLORS.dangerLight}22`, borderBottomWidth: 1, borderBottomColor: COLORS.dangerLight, padding: 10, alignItems: 'center' },
  newBannerText: { color: COLORS.dangerLight, fontWeight: '700', fontSize: 13 },
  list: { padding: 12 },
  incidentCard: { marginBottom: 10 },
  highCard: { borderLeftWidth: 4, borderLeftColor: COLORS.dangerLight },
  incidentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  incidentLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  incidentRight: { alignItems: 'flex-end', gap: 4 },
  incidentType: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  incidentZone: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  incidentTime: { fontSize: 10, color: COLORS.textSecondary, marginTop: 4 },
  incidentDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  detailChip: { backgroundColor: COLORS.surface2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  detailText: { fontSize: 11, color: COLORS.textSecondary },
  highPriorityBanner: { marginTop: 10, backgroundColor: `${COLORS.dangerLight}20`, borderRadius: 6, padding: 8 },
  highPriorityText: { color: COLORS.dangerLight, fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, color: COLORS.text, fontWeight: '600' },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center' },
});
