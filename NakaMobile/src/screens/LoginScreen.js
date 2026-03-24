import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Button } from '../components';
import { useAuthStore } from '../store';
import * as Haptics from 'expo-haptics';

const COLORS = {
  primary: '#1A237E',
  accent: '#FFD600',
  background: '#121212',
  surface: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  border: '#333333',
};

export const LoginScreen = ({ navigation }) => {
  const [badgeId, setBadgeId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore((state) => state.login);

  const handleLogin = async () => {
    if (!badgeId.trim() || !pin.trim()) {
      setError('Please enter Badge ID and PIN');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    login(badgeId, pin);
    navigation.replace('Main');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>⚡</Text>
          </View>
          <Text style={styles.title}>NakaMobile</Text>
          <Text style={styles.subtitle}>Traffic Police Command</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Badge ID</Text>
          <TextInput
            style={styles.input}
            value={badgeId}
            onChangeText={setBadgeId}
            placeholder="Enter Badge ID"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="characters"
            maxLength={10}
          />

          <Text style={[styles.label, styles.labelMargin]}>PIN</Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={setPin}
            placeholder="Enter PIN"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="numeric"
            secureTextEntry
            maxLength={4}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button title="Login" onPress={handleLogin} variant="accent" />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Authorized Personnel Only</Text>
          <Text style={styles.version}>v1.0.0</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: COLORS.accent,
  },
  logoIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    letterSpacing: 1,
  },
  form: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  labelMargin: {
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 14,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  error: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  version: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
});

export default LoginScreen;
