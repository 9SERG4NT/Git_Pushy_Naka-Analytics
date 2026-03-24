import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS, PulsingDot } from './src/components';
import MapScreen from './src/screens/MapScreen';
import IncidentsScreen from './src/screens/IncidentsScreen';
import BlockadesScreen from './src/screens/BlockadesScreen';
import StatsScreen from './src/screens/StatsScreen';
import ReportScreen from './src/screens/ReportScreen';
import { useIncidentStore, useConnectionStore } from './src/store';

const Tab = createBottomTabNavigator();

const TAB_ITEMS = [
  { name: 'Map', component: MapScreen, icon: '🗺️', label: 'Live Map' },
  { name: 'Incidents', component: IncidentsScreen, icon: '🚨', label: 'Incidents' },
  { name: 'Blockades', component: BlockadesScreen, icon: '🚧', label: 'Blockades' },
  { name: 'Stats', component: StatsScreen, icon: '📊', label: 'Stats' },
  { name: 'Report', component: ReportScreen, icon: '📋', label: 'Report' },
];

const TabIcon = ({ icon, label, focused, badge }) => (
  <View style={styles.tabIconContainer}>
    <View>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>{icon}</Text>
      {badge > 0 && (
        <View style={styles.tabBadge}>
          <Text style={styles.tabBadgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </View>
    <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
  </View>
);

export default function App() {
  const unreadCount = useIncidentStore((s) => s.unreadCount);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarShowLabel: false,
            tabBarActiveTintColor: COLORS.accent,
            tabBarInactiveTintColor: COLORS.textSecondary,
          }}
        >
          {TAB_ITEMS.map((item) => (
            <Tab.Screen
              key={item.name}
              name={item.name}
              component={item.component}
              options={{
                tabBarIcon: ({ focused }) => (
                  <TabIcon
                    icon={item.icon}
                    label={item.label}
                    focused={focused}
                    badge={item.name === 'Incidents' ? unreadCount : 0}
                  />
                ),
              }}
            />
          ))}
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: 72,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabIconFocused: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  tabLabelFocused: {
    color: COLORS.accent,
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: COLORS.dangerLight,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
