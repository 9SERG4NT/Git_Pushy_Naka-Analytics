import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Badge, Card } from '../components';
import { useAlertsStore } from '../store';
import { wsService } from '../services/websocket';
import { fetchViolations } from '../services/api';
import * as Haptics from 'expo-haptics';

const COLORS = {
  primary: '#1A237E',
  accent: '#FFD600',
  danger: '#D32F2F',
  warning: '#FF9800',
  background: '#121212',
  surface: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
};

export const AlertsScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const { alerts, addAlert, clearAlerts } = useAlertsStore();

  useEffect(() => {
    connectWebSocket();
    loadViolations();

    const interval = setInterval(loadViolations, 15000);
    return () => {
      clearInterval(interval);
      wsService.disconnect();
    };
  }, []);

  const connectWebSocket = async () => {
    try {
      await wsService.connect();
      wsService.subscribe((data) => {
        if (data.type === 'violation_event') {
          const alert = data.data;
          addAlert({
            ...alert,
            receivedAt: new Date().toISOString(),
          });
          
          if (alert.confidence > 0.85) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        }
      });
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  };

  const loadViolations = async () => {
    try {
      const response = await fetchViolations();
      if (response?.violations) {
        response.violations.forEach((v) => {
          addAlert({
            ...v,
            receivedAt: new Date().toISOString(),
          });
        });
      }
    } catch (error) {
      console.error('Load violations error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    clearAlerts();
    await loadViolations();
    setRefreshing(false);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence > 0.85) return COLORS.danger;
    if (confidence > 0.70) return COLORS.warning;
    return COLORS.primary;
  };

  const renderAlert = ({ item }) => {
    const isHighConfidence = item.confidence > 0.85;
    
    return (
      <Card style={[styles.alertCard, isHighConfidence && styles.highAlertCard]}>
        <View style={styles.alertHeader}>
          <View style={styles.alertTypeContainer}>
            <Text style={styles.alertType}>{item.type}</Text>
            <Badge 
              label={`${(item.confidence * 100).toFixed(0)}%`} 
              color={getConfidenceColor(item.confidence)} 
            />
          </View>
          <Text style={styles.alertTime}>
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
        </View>
        
        <View style={styles.alertBody}>
          <View style={styles.alertInfoRow}>
            <Text style={styles.alertLabel}>Zone:</Text>
            <Text style={styles.alertValue}>{item.zone}</Text>
          </View>
          <View style={styles.alertInfoRow}>
            <Text style={styles.alertLabel}>Vehicle:</Text>
            <Text style={styles.alertValue}>{item.vehicle_class}</Text>
          </View>
          <View style={styles.alertInfoRow}>
            <Text style={styles.alertLabel}>Weather:</Text>
            <Text style={styles.alertValue}>{item.weather}</Text>
          </View>
        </View>
        
        {isHighConfidence && (
          <View style={styles.highAlertBadge}>
            <Text style={styles.highAlertText}>HIGH PRIORITY</Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Alerts</Text>
        <Badge label={`${alerts.length} Events`} color={COLORS.danger} />
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderAlert}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📡</Text>
            <Text style={styles.emptyText}>No alerts yet</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh</Text>
          </View>
        }
      />
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
  list: {
    padding: 16,
  },
  alertCard: {
    marginBottom: 12,
  },
  highAlertCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  alertTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  alertBody: {
    gap: 4,
  },
  alertInfoRow: {
    flexDirection: 'row',
  },
  alertLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    width: 60,
  },
  alertValue: {
    fontSize: 12,
    color: COLORS.text,
    flex: 1,
  },
  highAlertBadge: {
    marginTop: 8,
    backgroundColor: COLORS.danger,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  highAlertText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});

export default AlertsScreen;
