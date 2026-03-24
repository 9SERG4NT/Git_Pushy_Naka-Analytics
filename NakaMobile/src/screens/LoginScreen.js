import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

const HEX_DOTS = ['', '', '', '', '', '', '', ''];

export default function LoginScreen() {
  const [badgeId, setBadgeId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!badgeId.trim()) { setError('BADGE ID REQUIRED'); return; }
    if (pin.length < 4) { setError('PIN MUST BE 4+ DIGITS'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await login(badgeId.trim().toUpperCase(), pin);
      if (!result.success) setError(result.message?.toUpperCase() || 'AUTHENTICATION FAILED');
    } catch (e) {
      setError('NETWORK ERROR — CHECK SERVER');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />

      {/* Tactical grid overlay */}
      <View style={styles.gridOverlay} pointerEvents="none">
        {HEX_DOTS.map((_, i) => (
          <View key={i} style={[styles.hexDot, { opacity: i % 2 === 0 ? 0.15 : 0.08 }]} />
        ))}
      </View>

      {/* Top accent line */}
      <View style={styles.topAccent} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Ionicons name="shield-checkmark" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.command}>OPS_COMMAND</Text>
          <Text style={styles.subtitle}>NAGPUR CITY TRAFFIC POLICE</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>NODE_ACTIVE · SECURE_CHANNEL</Text>
          </View>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert" size={14} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.fieldLabel}>BADGE IDENTIFIER</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="id-card-outline" size={18} color={COLORS.outlineVariant} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. NP001"
              placeholderTextColor={COLORS.outlineVariant}
              value={badgeId}
              onChangeText={(t) => { setBadgeId(t); setError(''); }}
              autoCapitalize="characters"
            />
            <View style={[styles.inputAccent, badgeId ? styles.inputAccentActive : null]} />
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>AUTH PIN</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.outlineVariant} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="4-digit PIN"
              placeholderTextColor={COLORS.outlineVariant}
              value={pin}
              onChangeText={(t) => { setPin(t); setError(''); }}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
            />
            <View style={[styles.inputAccent, pin.length >= 4 ? styles.inputAccentActive : null]} />
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.onPrimary} />
            ) : (
              <>
                <Ionicons name="flash" size={18} color={COLORS.onPrimary} />
                <Text style={styles.loginBtnText}>AUTHORIZE ACCESS</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Hints */}
        <View style={styles.hintBox}>
          <Text style={styles.hintTitle}>DEFAULT CREDENTIALS</Text>
          <View style={styles.hintRow}>
            <Text style={styles.hintLabel}>Badge:</Text>
            <Text style={styles.hintValue}>NP001 / NP002 / NP003</Text>
          </View>
          <View style={styles.hintRow}>
            <Text style={styles.hintLabel}>PIN:</Text>
            <Text style={styles.hintValue}>1234</Text>
          </View>
        </View>

        <Text style={styles.footer}>AUTHORIZED PERSONNEL ONLY · v2.4</Text>
      </ScrollView>

      {/* Bottom accent */}
      <View style={styles.bottomAccent} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 40,
    padding: 20,
  },
  hexDot: {
    width: 60,
    height: 70,
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 4,
  },
  topAccent: {
    height: 3,
    backgroundColor: COLORS.primary,
    width: '100%',
  },
  scrollContent: {
    padding: 28,
    paddingTop: 48,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  command: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.onSurface,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
    letterSpacing: 3,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceContainerHighest,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + '30',
    marginTop: 16,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.secondary,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
    letterSpacing: 1.5,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.errorContainer + '33',
    borderWidth: 1,
    borderColor: COLORS.error + '55',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  form: { gap: 4 },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
    letterSpacing: 2,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + '30',
    paddingHorizontal: 14,
    height: 52,
    position: 'relative',
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    color: COLORS.onSurface,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  inputAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.outlineVariant,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  inputAccentActive: {
    backgroundColor: COLORS.primary,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 8,
    gap: 10,
    marginTop: 24,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.onPrimary,
    letterSpacing: 2,
  },
  hintBox: {
    marginTop: 32,
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + '20',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
  },
  hintTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.secondary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  hintRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  hintLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
    width: 40,
  },
  hintValue: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.onSurface,
    fontVariant: ['tabular-nums'],
  },
  footer: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.outlineVariant,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 32,
  },
  bottomAccent: {
    height: 3,
    backgroundColor: COLORS.secondary,
    width: '40%',
    alignSelf: 'center',
    marginBottom: 8,
    borderRadius: 2,
  },
});
