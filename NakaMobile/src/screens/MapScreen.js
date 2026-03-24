import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Button, Badge } from '../components';
import { useNakaStore, useAuthStore } from '../store';
import { fetchRecommendations, fetchActiveNakas, updateNakaStatus } from '../services/api';
import * as Haptics from 'expo-haptics';

const COLORS = {
  primary: '#1A237E',
  accent: '#FFD600',
  danger: '#D32F2F',
  background: '#121212',
  surface: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
};

const NAGPUR_CENTER = {
  latitude: 21.1458,
  longitude: 79.0790,
};

export const MapScreen = () => {
  const mapRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [selectedNaka, setSelectedNaka] = useState(null);
  
  const { recommendations, activeNakas, currentNaka, setRecommendations, setActiveNakas, setCurrentNaka } = useNakaStore();
  const officer = useAuthStore((state) => state.officer);

  useEffect(() => {
    loadData();
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        return;
      }
      
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const loadData = async () => {
    try {
      const [recs, nakas] = await Promise.all([
        fetchRecommendations(10),
        fetchActiveNakas(),
      ]);
      
      if (recs?.recommendations) {
        const mapped = recs.recommendations.map((r, i) => ({
          id: r.cluster_id || i,
          latitude: r.latitude,
          longitude: r.longitude,
          title: r.time_window || `Naka ${i + 1}`,
          confidence: r.confidence,
          expectedYield: r.expected_violation_yield,
        }));
        setRecommendations(mapped);
      }
      
      if (nakas?.active_nakas) {
        setActiveNakas(nakas.active_nakas);
      }
    } catch (error) {
      console.error('Load data error:', error);
    }
  };

  const handleMarkActive = async () => {
    if (!location) {
      Alert.alert('Error', 'Unable to get your location');
      return;
    }

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
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Naka activated at your location');
      loadData();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to activate naka');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (item) => {
    const lat = item.latitude;
    const lon = item.longitude;
    const url = Platform.OS === 'ios'
      ? `maps:0,0?q=${lat},${lon}`
      : `geo:0,0?q=${lat},${lon}?q=${lat},${lon}`;
    
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Live Deployment</Text>
          <Text style={styles.headerSubtitle}>
            {currentNaka ? 'Naka Active' : 'No Active Naka'}
          </Text>
        </View>
        <Badge label={recommendations.length + ' Suggestions'} color={COLORS.primary} />
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            ...NAGPUR_CENTER,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {recommendations.map((item) => (
            <Marker
              key={item.id}
              coordinate={{ latitude: item.latitude, longitude: item.longitude }}
              title={item.title}
              description={`Confidence: ${(item.confidence * 100).toFixed(0)}%`}
              pinColor={COLORS.primary}
              onPress={() => setSelectedNaka(item)}
            />
          ))}
          
          {activeNakas.map((naka, i) => (
            <Marker
              key={`active-${i}`}
              coordinate={{ latitude: naka.latitude, longitude: naka.longitude }}
              title={naka.officer_name || 'Active Naka'}
              pinColor={COLORS.accent}
            />
          ))}
          
          {currentNaka && (
            <Marker
              coordinate={{ latitude: currentNaka.latitude, longitude: currentNaka.longitude }}
              title="Your Naka"
              pinColor={COLORS.accent}
            />
          )}
        </MapView>

        <View style={styles.floatingButtons}>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={() => location && mapRef.current?.animateToRegion({ ...location, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 500)}
          >
            <Text style={styles.locationIcon}>📍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {selectedNaka && (
        <View style={styles.nakaCard}>
          <View style={styles.nakaCardHeader}>
            <Text style={styles.nakaTitle}>{selectedNaka.title}</Text>
            <TouchableOpacity onPress={() => setSelectedNaka(null)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.nakaInfo}>
            Expected Yield: {selectedNaka.expectedYield} violations/hr
          </Text>
          <Text style={styles.nakaInfo}>
            Confidence: {(selectedNaka.confidence * 100).toFixed(0)}%
          </Text>
          <View style={styles.nakaActions}>
            <Button
              title="Navigate"
              onPress={() => handleNavigate(selectedNaka)}
              variant="outline"
            />
            <View style={styles.actionSpacer} />
            <Button
              title="Deploy Here"
              onPress={() => {
                setLocation({ latitude: selectedNaka.latitude, longitude: selectedNaka.longitude });
                handleMarkActive();
              }}
              variant="accent"
            />
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Button
          title={currentNaka ? 'Update Location' : 'Mark Active Naka'}
          onPress={handleMarkActive}
          variant={currentNaka ? 'outline' : 'accent'}
          disabled={loading}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  floatingButtons: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  locationButton: {
    backgroundColor: COLORS.surface,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  locationIcon: {
    fontSize: 20,
  },
  nakaCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  nakaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nakaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  nakaInfo: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  nakaActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionSpacer: {
    width: 8,
  },
  footer: {
    padding: 16,
    backgroundColor: COLORS.surface,
  },
});

export default MapScreen;
