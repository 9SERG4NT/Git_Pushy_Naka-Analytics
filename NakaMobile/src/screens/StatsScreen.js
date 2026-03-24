import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { StatCard, Card } from '../components';
import { useStatsStore, useAuthStore } from '../store';
import { fetchEDASummary } from '../services/api';

const COLORS = {
  primary: '#1A237E',
  accent: '#FFD600',
  danger: '#D32F2F',
  background: '#121212',
  surface: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
};

export const StatsScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const { stats, setStats } = useStatsStore();
  const officer = useAuthStore((state) => state.officer);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetchEDASummary();
      if (response?.summary) {
        setStats(response.summary);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  if (!stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading statistics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const violationData = Object.entries(stats.violation_counts || {}).map(([type, count]) => ({
    type,
    count,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Performance</Text>
          <Text style={styles.headerSubtitle}>{officer?.name}</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title="Total Records"
            value={stats.total_records?.toLocaleString() || '0'}
            subtitle="All time"
          />
          <StatCard
            title="Peak Hour"
            value={`${stats.hourly_peak}:00`}
            subtitle="Most violations"
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title="Weekend"
            value={stats.weekend_violations?.toLocaleString() || '0'}
            subtitle="Violations"
          />
          <StatCard
            title="Holiday"
            value={stats.holiday_violations?.toLocaleString() || '0'}
            subtitle="Violations"
          />
        </View>

        <Card style={styles.violationCard}>
          <Text style={styles.sectionTitle}>Violation Types</Text>
          {violationData.slice(0, 6).map((item, index) => (
            <View key={item.type} style={styles.violationRow}>
              <View style={styles.violationInfo}>
                <Text style={styles.violationType}>{item.type}</Text>
                <Text style={styles.violationCount}>{item.count}</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(item.count / stats.total_records) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </Card>

        <Card style={styles.geoCard}>
          <Text style={styles.sectionTitle}>Coverage Area</Text>
          <View style={styles.geoRow}>
            <Text style={styles.geoLabel}>Latitude:</Text>
            <Text style={styles.geoValue}>
              {stats.geo_bounds?.lat_min?.toFixed(4)} - {stats.geo_bounds?.lat_max?.toFixed(4)}
            </Text>
          </View>
          <View style={styles.geoRow}>
            <Text style={styles.geoLabel}>Longitude:</Text>
            <Text style={styles.geoValue}>
              {stats.geo_bounds?.lon_min?.toFixed(4)} - {stats.geo_bounds?.lon_max?.toFixed(4)}
            </Text>
          </View>
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Data from {stats.date_range?.start?.split('T')[0]} to {stats.date_range?.end?.split('T')[0]}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  violationCard: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  violationRow: {
    marginBottom: 12,
  },
  violationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  violationType: {
    fontSize: 14,
    color: COLORS.text,
  },
  violationCount: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.border || '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  geoCard: {
    marginTop: 8,
  },
  geoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  geoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    width: 80,
  },
  geoValue: {
    fontSize: 12,
    color: COLORS.text,
  },
  footer: {
    marginTop: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
});

export default StatsScreen;
