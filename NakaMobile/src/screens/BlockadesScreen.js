import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, RefreshControl, Switch,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  COLORS, Button, Card, Badge, SectionHeader, Divider, Loader,
} from '../components';
import { useBlockadeStore, useOfficerStore } from '../store';
import { fetchBlockades, createBlockade, updateBlockade, deleteBlockade } from '../services/api';
import * as Location from 'expo-location';

const BLOCKADE_TYPES = ['checkpoint', 'speed_check', 'helmet_check', 'dui_check', 'document_check'];
const STATUS_COLORS = { active: COLORS.successLight, inactive: COLORS.textSecondary, standby: COLORS.warning };

export default function BlockadesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'checkpoint', notes: '', useMyLocation: true });
  const [location, setLocation] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const { blockades, setBlockades, addBlockade, updateBlockadeStatus, removeBlockade, isLoading, setLoading, activeCount } = useBlockadeStore();
  const { officer } = useOfficerStore();

  useEffect(() => {
    loadBlockades();
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (e) { console.error('location:', e); }
  };

  const loadBlockades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchBlockades();
      if (res?.blockades) setBlockades(res.blockades);
    } catch (e) { console.error('blockades:', e); }
    finally { setLoading(false); }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBlockades();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) { Alert.alert('Error', 'Please enter a blockade name'); return; }
    const coords = formData.useMyLocation && location ? location : { latitude: 21.1458, longitude: 79.079 };
    const newBlockade = {
      id: `BLK-${Date.now()}`,
      ...formData,
      ...coords,
      status: 'active',
      officer_badge: officer.badgeId,
      officer_name: officer.name,
      zone: formData.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await createBlockade(newBlockade);
      addBlockade(newBlockade);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreateModal(false);
      setFormData({ name: '', type: 'checkpoint', notes: '', useMyLocation: true });
      Alert.alert('✅ Blockade Created', `${newBlockade.name} is now active`);
    } catch (e) { Alert.alert('Error', 'Could not create blockade'); }
  };

  const handleToggleStatus = async (blockade) => {
    const newStatus = blockade.status === 'active' ? 'inactive' : 'active';
    try {
      await updateBlockade(blockade.id, { status: newStatus });
      updateBlockadeStatus(blockade.id, newStatus);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) { Alert.alert('Error', 'Could not update status'); }
  };

  const handleDelete = (blockade) => {
    Alert.alert(
      'Remove Blockade',
      `Remove "${blockade.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await deleteBlockade(blockade.id);
              removeBlockade(blockade.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) { Alert.alert('Error', 'Could not remove blockade'); }
          },
        },
      ]
    );
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    try {
      await updateBlockade(editTarget.id, formData);
      const updated = { ...editTarget, ...formData, updatedAt: new Date().toISOString() };
      setBlockades(blockades.map((b) => (b.id === editTarget.id ? updated : b)));
      setShowEditModal(false);
      Alert.alert('✅ Updated', 'Blockade updated successfully');
    } catch (e) { Alert.alert('Error', 'Could not update blockade'); }
  };

  const openEdit = (blockade) => {
    setEditTarget(blockade);
    setFormData({ name: blockade.name, type: blockade.type, notes: blockade.notes || '', useMyLocation: false });
    setShowEditModal(true);
  };

  const filtered = filterStatus === 'all' ? blockades : blockades.filter((b) => b.status === filterStatus);

  const renderBlockade = ({ item }) => (
    <Card style={[styles.blockadeCard, item.status === 'active' && styles.activeBlockadeCard]}>
      <View style={styles.blockadeHeader}>
        <View style={styles.blockadeInfo}>
          <Text style={styles.blockadeName}>{item.name}</Text>
          <View style={styles.blockadeMeta}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] || COLORS.textSecondary }]} />
            <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || COLORS.textSecondary }]}>
              {item.status.toUpperCase()}
            </Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.blockadeType}>{item.type?.replace('_', ' ')}</Text>
          </View>
        </View>
        <Switch
          value={item.status === 'active'}
          onValueChange={() => handleToggleStatus(item)}
          trackColor={{ false: COLORS.surface2, true: `${COLORS.successLight}50` }}
          thumbColor={item.status === 'active' ? COLORS.successLight : COLORS.textSecondary}
        />
      </View>

      <Divider />

      <View style={styles.blockadeDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>👮 Officer:</Text>
          <Text style={styles.detailValue}>{item.officer_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📍 Zone:</Text>
          <Text style={styles.detailValue}>{item.zone}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>🕐 Created:</Text>
          <Text style={styles.detailValue}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
        {item.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>📝 {item.notes}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.blockadeActions}>
        <Button title="Edit" onPress={() => openEdit(item)} variant="outline" style={styles.actionBtn} />
        <Button title="Remove" onPress={() => handleDelete(item)} variant="danger" style={styles.actionBtn} />
      </View>
    </Card>
  );

  const BlockadeForm = () => (
    <>
      <Text style={styles.formLabel}>Blockade Name *</Text>
      <TextInput
        style={styles.input}
        value={formData.name}
        onChangeText={(v) => setFormData({ ...formData, name: v })}
        placeholder="e.g. Sitabuldi Junction Check"
        placeholderTextColor={COLORS.textSecondary}
        autoFocus
      />

      <Text style={styles.formLabel}>Type</Text>
      <View style={styles.typeGrid}>
        {BLOCKADE_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeChip, formData.type === t && styles.typeChipActive]}
            onPress={() => setFormData({ ...formData, type: t })}
          >
            <Text style={[styles.typeText, formData.type === t && styles.typeTextActive]}>
              {t.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.formLabel}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        value={formData.notes}
        onChangeText={(v) => setFormData({ ...formData, notes: v })}
        placeholder="e.g. DUI zone near bar area"
        placeholderTextColor={COLORS.textSecondary}
        multiline
        numberOfLines={3}
      />

      {!editTarget && (
        <View style={styles.locationRow}>
          <Text style={styles.formLabel}>Use My Location</Text>
          <Switch
            value={formData.useMyLocation}
            onValueChange={(v) => setFormData({ ...formData, useMyLocation: v })}
            trackColor={{ false: COLORS.surface2, true: `${COLORS.successLight}50` }}
            thumbColor={formData.useMyLocation ? COLORS.successLight : COLORS.textSecondary}
          />
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🚧 Blockade Management</Text>
          <Text style={styles.headerSub}>{activeCount} active • {blockades.length} total</Text>
        </View>
        <Button title="+ New" onPress={() => setShowCreateModal(true)} variant="accent" style={styles.newBtn} />
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        {['all', 'active', 'inactive'].map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterBtn, filterStatus === s && styles.filterBtnActive]}
            onPress={() => setFilterStatus(s)}
          >
            <View style={[styles.filterDot, { backgroundColor: STATUS_COLORS[s] || COLORS.textSecondary }]} />
            <Text style={[styles.filterLabel, filterStatus === s && styles.filterLabelActive]}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && blockades.length === 0 ? (
        <Loader message="Loading blockades..." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          renderItem={renderBlockade}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🚧</Text>
              <Text style={styles.emptyTitle}>No blockades {filterStatus !== 'all' ? `(${filterStatus})` : ''}</Text>
              <Text style={styles.emptySub}>Tap "+ New" to create a blockade</Text>
            </View>
          }
        />
      )}

      {/* Create Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Blockade</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <BlockadeForm />
            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={() => setShowCreateModal(false)} variant="ghost" style={{ flex: 1 }} />
              <Button title="Create Blockade" onPress={handleCreate} variant="accent" style={{ flex: 2 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Blockade</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <BlockadeForm />
            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={() => setShowEditModal(false)} variant="ghost" style={{ flex: 1 }} />
              <Button title="Save Changes" onPress={handleEdit} variant="accent" style={{ flex: 2 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  headerSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  newBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  filterBar: { flexDirection: 'row', backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border },
  filterBtnActive: { borderColor: COLORS.accent, backgroundColor: `${COLORS.primary}50` },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  filterLabelActive: { color: COLORS.accent },
  list: { padding: 12 },
  blockadeCard: { marginBottom: 12 },
  activeBlockadeCard: { borderLeftWidth: 4, borderLeftColor: COLORS.successLight },
  blockadeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  blockadeInfo: { flex: 1 },
  blockadeName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  blockadeMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  dot: { color: COLORS.textSecondary },
  blockadeType: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'capitalize' },
  blockadeDetails: { marginTop: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  detailLabel: { width: 90, fontSize: 12, color: COLORS.textSecondary },
  detailValue: { fontSize: 12, color: COLORS.text, flex: 1 },
  notesBox: { backgroundColor: COLORS.surface2, borderRadius: 8, padding: 8, marginTop: 6 },
  notesText: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic' },
  blockadeActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 9 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, color: COLORS.text, fontWeight: '600' },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderTopWidth: 1, borderColor: COLORS.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  modalClose: { fontSize: 20, color: COLORS.textSecondary, padding: 4 },
  formLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: COLORS.surface2, borderRadius: 10, padding: 12, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border },
  notesInput: { height: 80, textAlignVertical: 'top' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.accent },
  typeText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', textTransform: 'capitalize' },
  typeTextActive: { color: COLORS.accent },
  locationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
});
