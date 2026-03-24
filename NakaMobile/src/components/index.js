import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';

export const COLORS = {
  primary: '#1A237E',
  primaryLight: '#283593',
  accent: '#FFD600',
  accentDark: '#F9A825',
  danger: '#D32F2F',
  dangerLight: '#EF5350',
  warning: '#FF6F00',
  success: '#1B5E20',
  successLight: '#43A047',
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surface2: '#242424',
  text: '#FFFFFF',
  textSecondary: '#9E9E9E',
  border: '#2C2C2C',
  mapOverlay: 'rgba(26,35,126,0.85)',
};

// ─── Button ───────────────────────────────────────────────────────────────────
export const Button = ({ title, onPress, variant = 'primary', disabled = false, style }) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };

  const buttonStyles = [
    styles.button,
    variant === 'danger' && styles.dangerButton,
    variant === 'accent' && styles.accentButton,
    variant === 'outline' && styles.outlineButton,
    variant === 'success' && styles.successButton,
    variant === 'ghost' && styles.ghostButton,
    disabled && styles.disabledButton,
    style,
  ];

  const textStyles = [
    styles.buttonText,
    variant === 'outline' && styles.outlineText,
    variant === 'accent' && styles.accentText,
    variant === 'ghost' && styles.ghostText,
  ];

  return (
    <TouchableOpacity style={buttonStyles} onPress={handlePress} disabled={disabled} activeOpacity={0.75}>
      <Text style={textStyles}>{title}</Text>
    </TouchableOpacity>
  );
};

// ─── Card ────────────────────────────────────────────────────────────────────
export const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

// ─── Badge ───────────────────────────────────────────────────────────────────
export const Badge = ({ label, color = COLORS.primary, textColor = '#fff' }) => (
  <View style={[styles.badge, { backgroundColor: color }]}>
    <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
  </View>
);

// ─── StatCard ────────────────────────────────────────────────────────────────
export const StatCard = ({ title, value, subtitle, icon, accent }) => (
  <View style={[styles.statCard, accent && styles.statCardAccent]}>
    {icon ? <Text style={styles.statIcon}>{icon}</Text> : null}
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
    {subtitle ? <Text style={styles.statSubtitle}>{subtitle}</Text> : null}
  </View>
);

// ─── Loader ──────────────────────────────────────────────────────────────────
export const Loader = ({ message = 'Loading...' }) => (
  <View style={styles.loaderContainer}>
    <ActivityIndicator size="large" color={COLORS.accent} />
    <Text style={styles.loaderText}>{message}</Text>
  </View>
);

// ─── PulsingDot (live indicator) ─────────────────────────────────────────────
export const PulsingDot = ({ color = COLORS.successLight, size = 10 }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.8, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={{ width: size * 2, height: size * 2, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size * 2,
          height: size * 2,
          borderRadius: size,
          backgroundColor: color,
          opacity,
          transform: [{ scale }],
        }}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
};

// ─── ConnectionBadge ─────────────────────────────────────────────────────────
export const ConnectionBadge = ({ isConnected }) => (
  <View style={styles.connectionBadge}>
    <PulsingDot color={isConnected ? COLORS.successLight : COLORS.dangerLight} size={6} />
    <Text style={[styles.connectionText, { color: isConnected ? COLORS.successLight : COLORS.dangerLight }]}>
      {isConnected ? 'LIVE' : 'MOCK'}
    </Text>
  </View>
);

// ─── SeverityBadge ───────────────────────────────────────────────────────────
export const SeverityBadge = ({ severity }) => {
  const color =
    severity === 'HIGH' ? COLORS.dangerLight : severity === 'MEDIUM' ? COLORS.warning : COLORS.primaryLight;
  return <Badge label={severity} color={color} />;
};

// ─── ViolationIcon ────────────────────────────────────────────────────────────
export const VIOLATION_ICONS = {
  DUI: '🍺',
  No_Helmet: '⛑️',
  Speeding: '💨',
  Signal_Jump: '🚦',
  Overloading: '⚖️',
  Wrong_Way: '🔄',
  default: '🚔',
};

export const ViolationIcon = ({ type, size = 24 }) => (
  <Text style={{ fontSize: size }}>{VIOLATION_ICONS[type] || VIOLATION_ICONS.default}</Text>
);

// ─── ProgressBar ─────────────────────────────────────────────────────────────
export const ProgressBar = ({ value, max, color = COLORS.accent }) => {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
};

// ─── SectionHeader ───────────────────────────────────────────────────────────
export const SectionHeader = ({ title, right }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {right}
  </View>
);

// ─── Divider ─────────────────────────────────────────────────────────────────
export const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  dangerButton: { backgroundColor: COLORS.dangerLight },
  accentButton: { backgroundColor: COLORS.accent },
  outlineButton: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.accent },
  successButton: { backgroundColor: COLORS.successLight },
  ghostButton: { backgroundColor: 'transparent' },
  disabledButton: { opacity: 0.45 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  outlineText: { color: COLORS.accent },
  accentText: { color: '#000' },
  ghostText: { color: COLORS.textSecondary },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  statCardAccent: { borderColor: COLORS.accent, borderWidth: 1.5 },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statTitle: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { color: COLORS.text, fontSize: 22, fontWeight: 'bold' },
  statValueAccent: { color: COLORS.accent },
  statSubtitle: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loaderText: { color: COLORS.textSecondary, fontSize: 14, marginTop: 12 },
  connectionBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: COLORS.surface2, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  connectionText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  progressBar: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%', borderRadius: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, letterSpacing: 0.3 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
});
