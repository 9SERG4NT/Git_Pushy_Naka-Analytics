import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Platform,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getRecommendations, getActiveNakas, updateNakaStatus, getSyncState } from '../services/api';

const VIOLATION_CONFIG = {
  DUI:          { color: '#ff7351', icon: 'wine',        label: 'DUI' },
  No_Helmet:    { color: '#ff9159', icon: 'bicycle',     label: 'No Helmet' },
  Speeding:     { color: '#8B5CF6', icon: 'speedometer', label: 'Speeding' },
  Signal_Jump:  { color: '#38bdf8', icon: 'warning',     label: 'Signal Jump' },
  Overloading:  { color: '#4ade80', icon: 'car',         label: 'Overloading' },
  Wrong_Way:    { color: '#f43f5e', icon: 'arrow-undo',  label: 'Wrong Way' },
};

export default function MapScreen() {
  const { officer } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [activeNakas, setActiveNakas] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [selectedRec, setSelectedRec] = useState(null);
  const [violationCount, setViolationCount] = useState(0);

  useEffect(() => {
    loadData();
    getLocationPermission();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setMyLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    } catch (e) {}
  };

  const loadData = async () => {
    try {
      const [recRes, nakaRes, syncRes] = await Promise.all([
        getRecommendations(10),
        getActiveNakas(),
        getSyncState(),
      ]);
      if (recRes.status === 'success') setRecommendations(recRes.recommendations || []);
      if (nakaRes.status === 'success') setActiveNakas(nakaRes.active_nakas || []);
      if (syncRes.status === 'success') setViolationCount(syncRes.violation_count || 0);
    } catch (e) {
      console.log('Error loading map data:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeployHere = async () => {
    if (!myLocation) {
      Alert.alert('GPS Unavailable', 'Enable location to deploy a checkpoint.');
      return;
    }
    setDeploying(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const res = await updateNakaStatus(officer.badgeId, officer.name, myLocation.latitude, myLocation.longitude, 'active');
      Alert.alert('NAKA ACTIVATED', 'Your checkpoint is now live on the grid.', [{ text: 'CONFIRM', onPress: loadData }]);
    } catch (e) {
      Alert.alert('DEPLOY FAILED', 'Check server connection.');
    } finally {
      setDeploying(false);
    }
  };

  const handleDeployAtRec = async (rec) => {
    setDeploying(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await updateNakaStatus(officer.badgeId, officer.name, rec.location?.lat || 21.1458, rec.location?.lon || 79.0882, 'active');
      Alert.alert('UNIT ENGAGED', `Naka #${rec.rank} deployed at ${rec.naka_type?.replace('_',' ')} zone.`);
      setSelectedRec(null);
      loadData();
    } catch (e) {
      Alert.alert('ERROR', 'Failed to deploy naka.');
    } finally {
      setDeploying(false);
    }
  };

  const openMaps = (lat, lon, label) => {
    const url = Platform.OS === 'ios'
      ? `maps://?q=${label}&ll=${lat},${lon}`
      : `geo:${lat},${lon}?q=${lat},${lon}(${label})`;
    Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps?q=${lat},${lon}`));
  };

  const renderRec = ({ item: rec, index }) => {
    const cfg = VIOLATION_CONFIG[rec.naka_type] || { color: COLORS.info, icon: 'location', label: rec.naka_type };
    const isSelected = selectedRec?.rank === rec.rank;
    const isTop = index === 0;

    if (isTop) {
      // Featured hero card for rank #1
      return (
        <TouchableOpacity
          style={styles.heroCard}
          onPress={() => setSelectedRec(isSelected ? null : rec)}
          activeOpacity={0.85}
        >
          <View style={[styles.heroRankBadge, { backgroundColor: COLORS.secondary }]}>
            <Text style={styles.heroRankText}>#1</Text>
          </View>
          <View style={styles.heroContent}>
            <View style={styles.heroHeader}>
              <Text style={styles.heroType}>{cfg.label?.toUpperCase()}</Text>
              <Text style={[styles.heroConf, { color: cfg.color }]}>
                {(rec.confidence * 100).toFixed(0)}%
              </Text>
            </View>
            <Text style={styles.heroTime}>🕐 {rec.time_window}</Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>PRECISION</Text>
                <Text style={[styles.heroStatVal, { color: COLORS.secondary }]}>
                  {(rec.confidence * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>EXPECTED YIELD</Text>
                <Text style={[styles.heroStatVal, { color: COLORS.secondary }]}>
                  {(rec.expected_violation_yield * 100).toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>
          {isSelected && (
            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.engageBtn} onPress={() => handleDeployAtRec(rec)} disabled={deploying}>
                <Ionicons name="flash" size={16} color={COLORS.onPrimary} />
                <Text style={styles.engageBtnText}>ENGAGE UNIT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mapsBtn} onPress={() => openMaps(rec.location?.lat || 21.1458, rec.location?.lon || 79.0882, `Naka #${rec.rank}`)}>
                <Ionicons name="map-outline" size={16} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    // Standard cards
    return (
      <TouchableOpacity
        style={[styles.recRow, isSelected && styles.recRowSelected]}
        onPress={() => setSelectedRec(isSelected ? null : rec)}
        activeOpacity={0.8}
      >
        <Text style={styles.recRank}>#{rec.rank}</Text>
        <View style={styles.recInfo}>
          <Text style={styles.recType}>{cfg.label?.toUpperCase()} — {rec.time_window}</Text>
          <Text style={styles.recPrecision}>Precision: {(rec.confidence * 100).toFixed(0)}%</Text>
        </View>
        <Ionicons name={isSelected ? 'chevron-down' : 'chevron-forward'} size={16} color={COLORS.onSurfaceVariant} />
        {isSelected && (
          <TouchableOpacity
            style={[styles.engageBtn, { marginTop: 10, width: '100%' }]}
            onPress={() => handleDeployAtRec(rec)}
            disabled={deploying}
          >
            <Ionicons name="flash" size={14} color={COLORS.onPrimary} />
            <Text style={styles.engageBtnText}>ENGAGE UNIT</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>LOADING DEPLOYMENT DATA...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Status Banner */}
      <View style={styles.statusBanner}>
        <View style={styles.bannerItem}>
          <View style={[styles.bannerBadge, activeNakas.length > 0 ? styles.bannerBadgeActive : styles.bannerBadgeInactive]}>
            <View style={styles.bannerDot} />
            <Text style={styles.bannerBadgeText}>{activeNakas.length} ACTIVE BLOCKADE{activeNakas.length !== 1 ? 'S' : ''}</Text>
          </View>
        </View>
        <View style={styles.missionStatus}>
          <Text style={styles.missionLabel}>MISSION STATUS</Text>
          <Text style={styles.missionValue}>OPERATIONAL</Text>
        </View>
      </View>

      <FlatList
        data={recommendations}
        keyExtractor={(item, index) => `rec-${index}`}
        renderItem={renderRec}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Active Checkpoints */}
            {activeNakas.length > 0 && (
              <View style={styles.checkpointSection}>
                <Text style={styles.sectionTitle}>ACTIVE CHECKPOINTS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {activeNakas.map((naka, i) => (
                    <TouchableOpacity
                      key={`naka-${i}`}
                      style={styles.officerChip}
                      onPress={() => openMaps(naka.latitude, naka.longitude, naka.officer_name || 'Naka')}
                    >
                      <View style={styles.officerAvatar}>
                        <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
                      </View>
                      <View>
                        <Text style={styles.officerName}>{(naka.officer_name || naka.officer_id)?.toUpperCase()}</Text>
                        <Text style={[styles.officerStatus, { color: naka.status === 'active' ? COLORS.success : COLORS.onSurfaceVariant }]}>
                          {naka.status?.toUpperCase() || 'ONLINE'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Separator */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>AI RECOMMENDED DEPLOYMENTS</Text>
              <View style={styles.sectionLine} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="navigate-circle-outline" size={48} color={COLORS.outlineVariant} />
            <Text style={styles.emptyText}>NO DEPLOYMENT DATA</Text>
            <Text style={styles.emptySubtext}>Server may be offline</Text>
          </View>
        }
      />

      {/* Deploy Here FAB */}
      <TouchableOpacity
        style={[styles.deployFab, deploying && styles.deployFabDisabled]}
        onPress={handleDeployHere}
        disabled={deploying}
        activeOpacity={0.85}
      >
        {deploying ? (
          <ActivityIndicator color={COLORS.onSecondary} />
        ) : (
          <>
            <Ionicons name="navigate" size={20} color={COLORS.onSecondary} />
            <Text style={styles.deployFabText}>DEPLOY HERE</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface, gap: 12 },
  loadingText: { fontSize: 10, fontWeight: '700', color: COLORS.onSurfaceVariant, letterSpacing: 2 },

  statusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant + '20',
  },
  bannerItem: {},
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  bannerBadgeActive: { backgroundColor: COLORS.errorContainer + '33', borderWidth: 1, borderColor: COLORS.error + '44' },
  bannerBadgeInactive: { backgroundColor: COLORS.surfaceContainerHighest },
  bannerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.error },
  bannerBadgeText: { fontSize: 9, fontWeight: '700', color: COLORS.error, letterSpacing: 1.5 },
  missionStatus: { alignItems: 'flex-end' },
  missionLabel: { fontSize: 8, fontWeight: '700', color: COLORS.onSurfaceVariant, letterSpacing: 1.5 },
  missionValue: { fontSize: 14, fontWeight: '900', color: COLORS.secondary, letterSpacing: 1 },

  list: { padding: 16, paddingBottom: 100 },

  checkpointSection: { marginBottom: 20 },
  officerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceContainerHighest,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + '20',
    minWidth: 180,
  },
  officerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
  },
  officerName: { fontSize: 12, fontWeight: '700', color: COLORS.onSurface, letterSpacing: 1 },
  officerStatus: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: COLORS.onSurfaceVariant, letterSpacing: 2, marginBottom: 10 },
  sectionLine: { flex: 1, height: 1, backgroundColor: COLORS.outlineVariant + '20' },

  // Hero Card (#1)
  heroCard: {
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + '20',
    position: 'relative',
  },
  heroRankBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heroRankText: { fontSize: 18, fontWeight: '900', color: COLORS.onSecondary },
  heroContent: { paddingTop: 40 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  heroType: { fontSize: 20, fontWeight: '900', color: COLORS.onSurface, letterSpacing: -0.5 },
  heroConf: { fontSize: 28, fontWeight: '900' },
  heroTime: { fontSize: 11, color: COLORS.onSurfaceVariant, marginBottom: 12 },
  heroStats: { flexDirection: 'row', gap: 24, borderTopWidth: 1, borderTopColor: COLORS.outlineVariant + '20', paddingTop: 12 },
  heroStatItem: {},
  heroStatLabel: { fontSize: 9, fontWeight: '700', color: COLORS.onSurfaceVariant, letterSpacing: 1.5, marginBottom: 2 },
  heroStatVal: { fontSize: 16, fontWeight: '900' },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 16 },

  // Standard row
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  recRowSelected: { borderColor: COLORS.primary + '44', backgroundColor: COLORS.surfaceContainerHighest },
  recRank: { fontSize: 14, fontWeight: '900', color: COLORS.onSurfaceVariant, width: 28 },
  recInfo: { flex: 1 },
  recType: { fontSize: 12, fontWeight: '700', color: COLORS.onSurface, letterSpacing: 0.5 },
  recPrecision: { fontSize: 10, color: COLORS.onSurfaceVariant, marginTop: 2 },

  // Buttons
  engageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
  },
  engageBtnText: { fontSize: 11, fontWeight: '900', color: COLORS.onPrimary, letterSpacing: 1.5 },
  mapsBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.secondary + '44',
  },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 12, fontWeight: '700', color: COLORS.onSurfaceVariant, letterSpacing: 2 },
  emptySubtext: { fontSize: 11, color: COLORS.outlineVariant },

  deployFab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
    elevation: 8,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  deployFabDisabled: { opacity: 0.7 },
  deployFabText: { fontSize: 14, fontWeight: '900', color: COLORS.onSecondary, letterSpacing: 2 },
});
