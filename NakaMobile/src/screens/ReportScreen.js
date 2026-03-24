import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import {
  COLORS, Button, Card, SectionHeader, VIOLATION_ICONS,
} from '../components';
import { useOfficerStore } from '../store';
import { ingestViolation } from '../services/api';

const VIOLATION_TYPES = ['DUI', 'No_Helmet', 'Speeding', 'Signal_Jump', 'Overloading', 'Wrong_Way'];
const VEHICLE_TYPES = ['Two_Wheeler', 'Car', 'Auto', 'Truck', 'Bus', 'Three_Wheeler'];
const WEATHER_TYPES = ['Clear', 'Cloudy', 'Rain', 'Fog', 'Haze'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'];

const INITIAL_FORM = {
  type: '', vehicle_class: '', weather: 'Clear', severity: 'MEDIUM',
  zone: '', notes: '', useMyLocation: true,
};

export default function ReportScreen() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { officer } = useOfficerStore();

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.type) { Alert.alert('Required', 'Please select a violation type'); return; }
    if (!form.vehicle_class) { Alert.alert('Required', 'Please select vehicle type'); return; }
    if (!form.zone.trim()) { Alert.alert('Required', 'Please enter the zone / location'); return; }

    setSubmitting(true);
    try {
      let coords = { latitude: 21.1458, longitude: 79.079 };
      if (form.useMyLocation) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        }
      }

      const violation = {
        id: `RPT-${Date.now()}`,
        type: form.type,
        vehicle_class: form.vehicle_class,
        weather: form.weather,
        severity: form.severity,
        zone: form.zone,
        notes: form.notes,
        ...coords,
        reported_by: officer.badgeId,
        officer_name: officer.name,
        confidence: 0.95,
        timestamp: new Date().toISOString(),
        status: 'reported',
      };

      await ingestViolation(violation);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
      setForm(INITIAL_FORM);

      setTimeout(() => setSubmitted(false), 4000);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally { setSubmitting(false); }
  };

  const SelectionRow = ({ label, options, selected, onSelect, renderLabel }) => (
    <View style={styles.selectionGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectionList}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.selChip, selected === opt && styles.selChipActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(opt); }}
          >
            <Text style={[styles.selChipText, selected === opt && styles.selChipTextActive]}>
              {renderLabel ? renderLabel(opt) : opt.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📋 Report Incident</Text>
          <Text style={styles.headerSub}>Officer: {officer.name} ({officer.badgeId})</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {submitted && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✅ Violation reported successfully!</Text>
            </View>
          )}

          <Card>
            <SectionHeader title="Violation Details" />

            {/* Violation type */}
            <SelectionRow
              label="Violation Type *"
              options={VIOLATION_TYPES}
              selected={form.type}
              onSelect={(v) => update('type', v)}
              renderLabel={(v) => `${VIOLATION_ICONS[v] || '🚔'} ${v.replace('_', ' ')}`}
            />

            {/* Vehicle type */}
            <SelectionRow
              label="Vehicle Type *"
              options={VEHICLE_TYPES}
              selected={form.vehicle_class}
              onSelect={(v) => update('vehicle_class', v)}
            />

            {/* Weather */}
            <SelectionRow
              label="Weather Condition"
              options={WEATHER_TYPES}
              selected={form.weather}
              onSelect={(v) => update('weather', v)}
            />

            {/* Severity */}
            <Text style={styles.formLabel}>Severity *</Text>
            <View style={styles.severityRow}>
              {SEVERITIES.map((s) => {
                const color = s === 'HIGH' ? COLORS.dangerLight : s === 'MEDIUM' ? COLORS.warning : COLORS.primaryLight;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.sevBtn, form.severity === s && { backgroundColor: color, borderColor: color }]}
                    onPress={() => update('severity', s)}
                  >
                    <Text style={[styles.sevText, form.severity === s && { color: '#fff' }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          <Card>
            <SectionHeader title="Location Details" />

            <Text style={styles.formLabel}>Zone / Location *</Text>
            <TextInput
              style={styles.input}
              value={form.zone}
              onChangeText={(v) => update('zone', v)}
              placeholder="e.g. Sitabuldi Junction, near Metro Gate"
              placeholderTextColor={COLORS.textSecondary}
            />

            <TouchableOpacity
              style={styles.locationToggle}
              onPress={() => update('useMyLocation', !form.useMyLocation)}
            >
              <View style={[styles.checkbox, form.useMyLocation && styles.checkboxChecked]}>
                {form.useMyLocation && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.locationToggleText}>Use my current GPS location for coordinates</Text>
            </TouchableOpacity>
          </Card>

          <Card>
            <SectionHeader title="Additional Notes" />
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={form.notes}
              onChangeText={(v) => update('notes', v)}
              placeholder="Any additional information about the incident..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
            />
          </Card>

          {/* Summary preview */}
          {form.type && form.vehicle_class && (
            <Card style={styles.previewCard}>
              <Text style={styles.previewTitle}>📄 Report Summary</Text>
              <Text style={styles.previewText}>
                {`${VIOLATION_ICONS[form.type] || '🚔'} ${form.type.replace('_', ' ')} violation by ${form.vehicle_class.replace('_', ' ')} in ${form.zone || '[location TBD]'}\nSeverity: ${form.severity} | Weather: ${form.weather}\nReported by: ${officer.name} (${officer.badgeId})`}
              </Text>
            </Card>
          )}

          <Button
            title={submitting ? 'Submitting...' : '📤 Submit Violation Report'}
            onPress={handleSubmit}
            variant="accent"
            disabled={submitting}
            style={styles.submitBtn}
          />

          <Text style={styles.disclaimer}>
            Reports are ingested into the NakaAnalytics system and used to improve real-time deployment recommendations.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  headerSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  content: { padding: 12, paddingBottom: 32 },
  successBanner: { backgroundColor: `${COLORS.successLight}25`, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.successLight, alignItems: 'center' },
  successText: { color: COLORS.successLight, fontWeight: '700', fontSize: 15 },
  formLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  selectionGroup: { marginBottom: 12 },
  selectionList: { gap: 8, paddingVertical: 4 },
  selChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface2, borderWidth: 1.5, borderColor: COLORS.border },
  selChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.accent },
  selChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  selChipTextActive: { color: COLORS.accent },
  severityRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  sevBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.surface2 },
  sevText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  input: { backgroundColor: COLORS.surface2, borderRadius: 10, padding: 12, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: 4 },
  notesInput: { height: 100, textAlignVertical: 'top' },
  locationToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: COLORS.successLight, borderColor: COLORS.successLight },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  locationToggleText: { fontSize: 13, color: COLORS.textSecondary },
  previewCard: { backgroundColor: COLORS.surface2, borderColor: COLORS.accent, borderWidth: 1 },
  previewTitle: { fontSize: 13, color: COLORS.accent, fontWeight: '700', marginBottom: 8 },
  previewText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
  submitBtn: { marginTop: 8, paddingVertical: 16 },
  disclaimer: { textAlign: 'center', fontSize: 10, color: COLORS.textSecondary, marginTop: 10, paddingHorizontal: 16, lineHeight: 15 },
});
