import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, RefreshControl,
} from 'react-native';
import {
  COLORS, StatCard, Card, Badge, SectionHeader, ProgressBar, Loader,
} from '../components';
import { useStatsStore, useOfficerStore, useBlockadeStore } from '../store';
import { fetchEDASummary, fetchModelStatus } from '../services/api';

const VIOLATION_COLORS_LIST = [
  COLORS.dangerLight, COLORS.warning, COLORS.accent, COLORS.primaryLight,
  COLORS.successLight, '#AB47BC',
];

export default function StatsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { stats, modelStatus, setStats, setModelStatus } = useStatsStore();
  const { officer } = useOfficerStore();
  const { activeCount } = useBlockadeStore();

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [edaRes, modelRes] = await Promise.all([fetchEDASummary(), fetchModelStatus()]);
      if (edaRes?.summary) setStats(edaRes.summary);
      if (modelRes) setModelStatus(modelRes);
    } catch (e) { console.error('loadAll:', e); }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  if (!stats) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Statistics</Text>
      </View>
      <Loader message="Loading statistics..." />
    </SafeAreaView>
  );

  const violationEntries = Object.entries(stats.violation_counts || {});
  const maxViol = Math.max(...violationEntries.map(([, c]) => c));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📊 Statistics</Text>
          <Text style={styles.headerSub}>Officer: {officer.name} • {officer.zone}</Text>
        </View>
        <View style={styles.modelBadge}>
          <Text style={styles.modelBadgeText}>
            {modelStatus?.status === 'ready' ? '✅' : '⚠️'} Model v{modelStatus?.version || '—'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
      >
        {/* Key metrics */}
        <SectionHeader title="Today at a Glance" />
        <View style={styles.row}>
          <StatCard icon="📋" title="Total Records" value={stats.total_records?.toLocaleString() || '0'} subtitle="All time" />
          <StatCard icon="🚨" title="Today" value={(stats.today_violations || 0).toLocaleString()} subtitle="Violations detected" accent />
        </View>
        <View style={styles.row}>
          <StatCard icon="⏰" title="Peak Hour" value={`${stats.hourly_peak}:00`} subtitle="Highest activity" />
          <StatCard icon="🚧" title="Active Nakas" value={String(activeCount)} subtitle="Currently deployed" />
        </View>

        {/* Model performance */}
        {modelStatus && (
          <Card style={styles.modelCard}>
            <SectionHeader title="ML Model Performance" />
            <View style={styles.modelRow}>
              <Text style={styles.modelLabel}>Accuracy:</Text>
              <Text style={styles.modelValue}>{((modelStatus.accuracy || 0) * 100).toFixed(1)}%</Text>
            </View>
            <ProgressBar value={(modelStatus.accuracy || 0) * 100} max={100} color={COLORS.successLight} />
            <View style={[styles.modelRow, { marginTop: 10 }]}>
              <Text style={styles.modelLabel}>Drift PSI:</Text>
              <Text style={[styles.modelValue, { color: (modelStatus.drift_psi || 0) > 0.2 ? COLORS.dangerLight : COLORS.successLight }]}>
                {(modelStatus.drift_psi || 0).toFixed(3)}
              </Text>
            </View>
            <View style={styles.modelRow}>
              <Text style={styles.modelLabel}>Last Trained:</Text>
              <Text style={styles.modelValue}>
                {modelStatus.last_trained ? new Date(modelStatus.last_trained).toLocaleString() : '—'}
              </Text>
            </View>
          </Card>
        )}

        {/* Violation breakdown */}
        <Card style={styles.violCard}>
          <SectionHeader title="Violation Breakdown" />
          {violationEntries.map(([type, count], idx) => (
            <View key={type} style={styles.violRow}>
              <View style={styles.violLeft}>
                <Text style={styles.violType}>{type.replace('_', ' ')}</Text>
                <Text style={styles.violCount}>{count.toLocaleString()}</Text>
              </View>
              <ProgressBar value={count} max={maxViol} color={VIOLATION_COLORS_LIST[idx % VIOLATION_COLORS_LIST.length]} />
            </View>
          ))}
        </Card>

        {/* Weekend / Holiday */}
        <View style={styles.row}>
          <StatCard icon="📅" title="Weekend" value={(stats.weekend_violations || 0).toLocaleString()} subtitle="Violations" />
          <StatCard icon="🎉" title="Holiday" value={(stats.holiday_violations || 0).toLocaleString()} subtitle="Violations" />
        </View>

        {/* Top zones */}
        {stats.top_zones && stats.top_zones.length > 0 && (
          <Card>
            <SectionHeader title="Top Hotspot Zones" />
            {stats.top_zones.map((zone, i) => (
              <View key={zone.zone} style={styles.zoneRow}>
                <Text style={[styles.zoneRank, { color: i === 0 ? COLORS.accent : COLORS.textSecondary }]}>#{i + 1}</Text>
                <Text style={styles.zoneName}>{zone.zone}</Text>
                <Badge label={zone.count.toLocaleString()} color={i === 0 ? COLORS.primary : COLORS.surface2} />
              </View>
            ))}
          </Card>
        )}

        {/* Coverage */}
        <Card>
          <SectionHeader title="Coverage Area" />
          <View style={styles.coverageGrid}>
            <View style={styles.coverageCell}>
              <Text style={styles.coverageLabel}>Lat Range</Text>
              <Text style={styles.coverageValue}>
                {stats.geo_bounds?.lat_min?.toFixed(3)} – {stats.geo_bounds?.lat_max?.toFixed(3)}
              </Text>
            </View>
            <View style={styles.coverageCell}>
              <Text style={styles.coverageLabel}>Lon Range</Text>
              <Text style={styles.coverageValue}>
                {stats.geo_bounds?.lon_min?.toFixed(3)} – {stats.geo_bounds?.lon_max?.toFixed(3)}
              </Text>
            </View>
          </View>
        </Card>

        <Text style={styles.footer}>
          Data: {stats.date_range?.start?.split('T')[0]} → {stats.date_range?.end?.split('T')[0]} • Refreshes every 60s
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  headerSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  modelBadge: { backgroundColor: COLORS.surface2, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border },
  modelBadgeText: { fontSize: 11, color: COLORS.text, fontWeight: '600' },
  content: { padding: 12, paddingBottom: 24 },
  row: { flexDirection: 'row', marginBottom: 8 },
  modelCard: {},
  modelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modelLabel: { fontSize: 12, color: COLORS.textSecondary },
  modelValue: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  violCard: {},
  violRow: { marginBottom: 12 },
  violLeft: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  violType: { fontSize: 13, color: COLORS.text },
  violCount: { fontSize: 13, color: COLORS.accent, fontWeight: '700' },
  zoneRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  zoneRank: { fontSize: 16, fontWeight: 'bold', width: 32 },
  zoneName: { flex: 1, fontSize: 13, color: COLORS.text },
  coverageGrid: { flexDirection: 'row', gap: 12 },
  coverageCell: { flex: 1, backgroundColor: COLORS.surface2, borderRadius: 10, padding: 12 },
  coverageLabel: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 4, textTransform: 'uppercase', fontWeight: '600' },
  coverageValue: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  footer: { textAlign: 'center', fontSize: 10, color: COLORS.textSecondary, marginTop: 8 },
});
