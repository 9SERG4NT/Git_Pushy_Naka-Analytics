import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import MapScreen from './src/screens/MapScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import StatsScreen from './src/screens/StatsScreen';
import LiveMapScreen from './src/screens/LiveMapScreen';
import { COLORS } from './src/constants/theme';

const Tab = createBottomTabNavigator();

// React Navigation v7 requires fonts in theme
const systemFonts = Platform.select({
  ios: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium:  { fontFamily: 'System', fontWeight: '500' },
    bold:    { fontFamily: 'System', fontWeight: '600' },
    heavy:   { fontFamily: 'System', fontWeight: '700' },
  },
  default: {
    regular: { fontFamily: 'sans-serif', fontWeight: 'normal' },
    medium:  { fontFamily: 'sans-serif-medium', fontWeight: 'normal' },
    bold:    { fontFamily: 'sans-serif', fontWeight: '600' },
    heavy:   { fontFamily: 'sans-serif', fontWeight: '700' },
  },
});

const OPSTheme = {
  dark: true,
  colors: {
    primary: COLORS.primary,
    background: COLORS.surface,
    card: COLORS.surfaceContainer,
    text: COLORS.onSurface,
    border: COLORS.outlineVariant + '33',
    notification: COLORS.error,
  },
  fonts: systemFonts,
};

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Deploy:  focused ? 'navigate'             : 'navigate-outline',
            Alerts:  focused ? 'notifications-sharp'  : 'notifications-outline',
            LiveMap: focused ? 'map'                 : 'map-outline',
            Stats:   focused ? 'analytics'           : 'analytics-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.outlineVariant,
        tabBarStyle: {
          backgroundColor: COLORS.surfaceContainerLow,
          borderTopColor: COLORS.outlineVariant + '20',
          borderTopWidth: 1,
          height: 66,
          paddingBottom: 10,
          paddingTop: 6,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginTop: 2,
        },
        tabBarItemStyle: {
          borderRadius: 10,
        },
        tabBarActiveBackgroundColor: COLORS.surfaceContainerHighest,
        headerStyle: {
          backgroundColor: COLORS.surface,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.outlineVariant + '20',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: COLORS.onSurface,
        headerTitleStyle: {
          fontWeight: '900',
          fontSize: 16,
          letterSpacing: 2,
        },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 16, backgroundColor: COLORS.surfaceContainerHighest, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: COLORS.outlineVariant + '20' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.secondary }} />
            <Text style={{ fontSize: 8, fontWeight: '700', color: COLORS.onSurfaceVariant, letterSpacing: 1.5 }}>NODE_ACTIVE</Text>
          </View>
        ),
      })}
    >
      <Tab.Screen
        name="Deploy"
        component={MapScreen}
        options={{ headerTitle: 'OPS_COMMAND · DEPLOY' }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{ headerTitle: 'OPS_COMMAND · ALERTS' }}
      />
      <Tab.Screen
        name="LiveMap"
        component={LiveMapScreen}
        options={{ title: 'Live Map', headerTitle: 'OPS_COMMAND · LIVE MAP' }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{ headerTitle: 'OPS_COMMAND · ANALYTICS' }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { isLoggedIn, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface, gap: 16 }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.onSurfaceVariant, letterSpacing: 3 }}>
          AUTHENTICATING...
        </Text>
      </View>
    );
  }

  if (!isLoggedIn) return <LoginScreen />;
  return <AppTabs />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={OPSTheme}>
        <StatusBar style="light" />
        <AppContent />
      </NavigationContainer>
    </AuthProvider>
  );
}
