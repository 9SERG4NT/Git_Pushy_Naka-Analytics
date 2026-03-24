import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import MapView, { Marker, Circle, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import {
  COLORS, Button, Badge, Card, ConnectionBadge, PulsingDot, SeverityBadge, VIOLATION_ICONS,
} from '../components';
import { useNakaStore, useOfficerStore, useConnectionStore, useIncidentStore } from '../store';
import { fetchRecommendations, fetchActiveNakas, updateNakaStatus } from '../services/api';
import { wsService } from '../services/websocket';

const NAGPUR_CENTER = { latitude: 21.1458, longitude: 79.079 };

const PRIORITY_COLORS = { HIGH: COLORS.dangerLight, MEDIUM: COLORS.warning, LOW: COLORS.primaryLight };

export default function MapScreen() {
  const mapRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [mapType, setMapType] = useState('standard');
  const [showLegend, setShowLegend] = useState(false);
  const [liveIncidents, setLiveIncidents] = useState([]);

  const { recommendations, activeNakas, currentNaka, setRecommendations, setActiveNakas, setCurrentNaka, clearCurrentNaka } = useNakaStore();
  const { officer } = useOfficerStore();
  const isConnected = useConnectionStore((s) => s.isConnected);

  useEffect(() => {
    initMap();
    wsService.connect();

    const unsub = wsService.subscribe((data) => {
      if (data.type === 'violation_event') {
        setLiveIncidents((prev) => [data.data, ...prev].slice(0, 30));
      }
    });

    const refreshInterval = setInterval(loadData, 30000);

    return () => {
      unsub();
      clearInterval(refreshInterval);
    };
  }, []);

  const initMap = async () => {
    await getLocation();
    await loadData();
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (e) { console.error('Location error:', e); }
  };

  const loadData = useCallback(async () => {
    try {
      const [recs, nakas] = await Promise.all([fetchRecommendations(12), fetchActiveNakas()]);
      if (recs?.recommendations) {
        const mapped = recs.recommendations.map((r, i) => ({
          id: r.cluster_id ?? `r${i}`,
          latitude: r.latitude,
          longitude: r.longitude,
          title: r.title || r.zone || `Naka ${i + 1}`,
          confidence: r.confidence,
          expectedYield: r.expectedYield ?? r.expected_violation_yield ?? 0,
          priority: r.priority || 'MEDIUM',
          violationType: r.violation_type,
        }));
        setRecommendations(mapped);
      }
      if (nakas?.active_nakas) setActiveNakas(nakas.active_nakas);
    } catch (e) { console.error('loadData error:', e); }
  }, []);

  const handleMarkActive = async () => {
    if (!location) { Alert.alert('Error', 'Unable to get your location. Please enable GPS.'); return; }
    setLoading(true);
    try {
      await updateNakaStatus({
        officer_id: officer.badgeId,
        officer_name: officer.name,
        latitude: location.latitude,
        longitude: location.longitude,
        status: 'active',
      });
      setCurrentNaka({
        latitude: location.latitude,
        longitude: location.longitude,
        activatedAt: new Date().toISOString(),
        officer_name: officer.name,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Naka Activated', `Active at your location`);
      loadData();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to activate naka');
    } finally { setLoading(false); }
  };

  const handleDeactivate = async () => {
    setLoading(true);
    try {
      await updateNakaStatus({ officer_id: officer.badgeId, status: 'inactive' });
      clearCurrentNaka();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) { Alert.alert('Error', 'Could not deactivate naka'); }
    finally { setLoading(false); }
  };

  const handleNavigate = (item) => {
    const { latitude: lat, longitude: lon } = item;
    const url = Platform.OS === 'ios' ? `maps:0,0?q=${lat},${lon}` : `geo:0,0?q=${lat},${lon}`;
    Linking.openURL(url);
  };

  const centerOnUser = () => {
    if (location) {
      mapRef.current?.animateToRegion({ ...location, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 600);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🗺️ Live Deployment</Text>
          <Text style={styles.headerSub}>Nagpur Traffic Intelligence</Text>
        </View>
        <View style={styles.headerRight}>
          <ConnectionBadge isConnected={isConnected} />
          {currentNaka && (
            <View style={styles.activeIndicator}>
              <PulsingDot color={COLORS.successLight} size={7} />
              <Text style={styles.activeText}>ACTIVE</Text>
            </View>
          )}
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          mapType={mapType}
          initialRegion={{ ...NAGPUR_CENTER, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass
          showsScale
        >
          {/* Recommendation markers */}
          {recommendations.map((item) => (
            <React.Fragment key={`rec-${item.id}`}>
              <Circle
                center={{ latitude: item.latitude, longitude: item.longitude }}
                radius={300}
                fillColor={`${PRIORITY_COLORS[item.priority] || COLORS.primary}22`}
                strokeColor={`${PRIORITY_COLORS[item.priority] || COLORS.primary}88`}
                strokeWidth={1.5}
              />
              <Marker
                coordinate={{ latitude: item.latitude, longitude: item.longitude }}
                title={item.title}
                description={`Priority: ${item.priority} | Yield: ${item.expectedYield}/hr`}
                pinColor={PRIORITY_COLORS[item.priority] || COLORS.primary}
                onPress={() => setSelectedItem({ ...item, _type: 'recommendation' })}
              />
            </React.Fragment>
          ))}

          {/* Active nakas */}
          {activeNakas.map((naka, i) => (
            <Marker
              key={`active-${i}`}
              coordinate={{ latitude: naka.latitude, longitude: naka.longitude }}
              title={naka.officer_name || 'Active Naka'}
              description={`Violations caught: ${naka.violations_caught || 0}`}
              pinColor={COLORS.accent}
            />
          ))}

          {/* Current officer naka */}
          {currentNaka && (
            <Marker
              coordinate={{ latitude: currentNaka.latitude, longitude: currentNaka.longitude }}
              title={`Your Naka (${officer.name})`}
              pinColor={COLORS.successLight}
            />
          )}

          {/* Live incidents */}
          {liveIncidents.map((inc, i) => (
            <Marker
              key={`inc-${inc.id || i}`}
              coordinate={{ latitude: inc.latitude, longitude: inc.longitude }}
              title={`${VIOLATION_ICONS[inc.type] || '🚔'} ${inc.type}`}
              description={inc.zone}
              pinColor={COLORS.dangerLight}
              onPress={() => setSelectedItem({ ...inc, _type: 'incident' })}
            />
          ))}
        </MapView>

        {/* Floating controls */}
        <View style={styles.floatingControls}>
          <TouchableOpacity style={styles.floatBtn} onPress={centerOnUser}>
            <Text style={styles.floatBtnIcon}>📍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.floatBtn} onPress={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}>
            <Text style={styles.floatBtnIcon}>{mapType === 'standard' ? '🛰️' : '🗺️'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.floatBtn} onPress={() => setShowLegend(true)}>
            <Text style={styles.floatBtnIcon}>ℹ️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.floatBtn} onPress={loadData}>
            <Text style={styles.floatBtnIcon}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{recommendations.length}</Text>
            <Text style={styles.statLbl}>Suggestions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{activeNakas.length + (currentNaka ? 1 : 0)}</Text>
            <Text style={styles.statLbl}>Deployed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: COLORS.dangerLight }]}>{liveIncidents.length}</Text>
            <Text style={styles.statLbl}>Live Events</Text>
          </View>
        </View>
      </View>

      {/* Selected item card */}
      {selectedItem && (
        <View style={styles.selectedCard}>
          <View style={styles.selectedCardHeader}>
            <Text style={styles.selectedCardTitle}>
              {selectedItem._type === 'recommendation' ? `📍 ${selectedItem.title}` : `🚨 ${selectedItem.type}`}
            </Text>
            <TouchableOpacity onPress={() => setSelectedItem(null)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {selectedItem._type === 'recommendation' ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Priority:</Text>
                <SeverityBadge severity={selectedItem.priority} />
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Expected Yield:</Text>
                <Text style={styles.infoValue}>{selectedItem.expectedYield} violations/hr</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Confidence:</Text>
                <Text style={styles.infoValue}>{((selectedItem.confidence || 0) * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.cardActions}>
                <Button title="Navigate" onPress={() => handleNavigate(selectedItem)} variant="outline" style={{ flex: 1 }} />
                <View style={{ width: 8 }} />
                <Button
                  title="Deploy Here"
                  onPress={() => { setLocation({ latitude: selectedItem.latitude, longitude: selectedItem.longitude }); handleMarkActive(); setSelectedItem(null); }}
                  variant="accent"
                  style={{ flex: 1 }}
                  disabled={loading}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Zone:</Text>
                <Text style={styles.infoValue}>{selectedItem.zone}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Vehicle:</Text>
                <Text style={styles.infoValue}>{selectedItem.vehicle_class}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Confidence:</Text>
                <Text style={styles.infoValue}>{((selectedItem.confidence || 0) * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.cardActions}>
                <Button title="Navigate to Incident" onPress={() => handleNavigate(selectedItem)} variant="outline" style={{ flex: 1 }} />
              </View>
            </>
          )}
        </View>
      )}

      {/* Bottom bar */}
      {!selectedItem && (
        <View style={styles.bottomBar}>
          {currentNaka ? (
            <View style={styles.bottomBarRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nakaActiveLabel}>Your Naka is Active</Text>
                <Text style={styles.nakaActiveSince}>
                  Since {new Date(currentNaka.activatedAt).toLocaleTimeString()}
                </Text>
              </View>
              <Button title="Deactivate" onPress={handleDeactivate} variant="danger" disabled={loading} />
            </View>
          ) : (
            <Button
              title={loading ? 'Activating...' : '🚔 Mark Active Naka at My Location'}
              onPress={handleMarkActive}
              variant="accent"
              disabled={loading}
            />
          )}
        </View>
      )}

      {/* Legend modal */}
      <Modal visible={showLegend} transparent animationType="fade" onRequestClose={() => setShowLegend(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLegend(false)}>
          <View style={styles.legendCard}>
            <Text style={styles.legendTitle}>Map Legend</Text>
            {[
              { color: COLORS.dangerLight, label: 'HIGH priority recommendation' },
              { color: COLORS.warning, label: 'MEDIUM priority recommendation' },
              { color: COLORS.primaryLight, label: 'LOW priority recommendation' },
              { color: COLORS.accent, label: 'Active deployed naka' },
              { color: COLORS.successLight, label: 'Your active naka' },
              { color: COLORS.dangerLight, label: 'Live violation incident' },
            ].map((item, i) => (
              <View key={i} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  headerSub: { fontSize: 11, color: COLORS.textSecondary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activeIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: `${COLORS.successLight}20`, borderRadius: 12, borderWidth: 1, borderColor: COLORS.successLight },
  activeText: { fontSize: 10, fontWeight: '800', color: COLORS.successLight, letterSpacing: 1 },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  floatingControls: { position: 'absolute', right: 12, top: 12, gap: 8 },
  floatBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4 },
  floatBtnIcon: { fontSize: 18 },
  statsBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.mapOverlay, flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: 'bold', color: COLORS.accent },
  statLbl: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  selectedCard: { position: 'absolute', left: 12, right: 12, bottom: 70, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.5, shadowRadius: 10 },
  selectedCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  selectedCardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, flex: 1 },
  closeBtn: { fontSize: 18, color: COLORS.textSecondary, paddingLeft: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoLabel: { fontSize: 12, color: COLORS.textSecondary, width: 110 },
  infoValue: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  cardActions: { flexDirection: 'row', marginTop: 12 },
  bottomBar: { padding: 12, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  bottomBarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nakaActiveLabel: { fontSize: 14, fontWeight: 'bold', color: COLORS.successLight },
  nakaActiveSince: { fontSize: 11, color: COLORS.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', padding: 16 },
  legendCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  legendTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 14 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  legendDot: { width: 14, height: 14, borderRadius: 7, marginRight: 10 },
  legendLabel: { fontSize: 13, color: COLORS.textSecondary },
});
