import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS, API_BASE_URL } from '../constants/theme';
import { getSyncState, updateNakaStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ─── Leaflet HTML that auto-polls the backend ───
const buildMapHTML = (apiBase) => `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"><\/script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0c0e11;font-family:-apple-system,system-ui,sans-serif}
  #map{width:100%;height:100vh}
  .leaflet-container{background:#0c0e11}
  .leaflet-popup-content-wrapper{background:#171a1d;color:#f9f9fd;border:1px solid #46484b;border-radius:10px;font-size:12px}
  .leaflet-popup-tip{background:#171a1d}
  .popup-v b{color:#ff9159}
  .popup-n b{color:#fdd400}
  #hud{position:fixed;top:8px;left:8px;z-index:1000;display:flex;gap:6px}
  .hud-pill{background:rgba(23,26,29,0.92);border:1px solid rgba(70,72,75,0.3);border-radius:8px;padding:4px 10px;color:#aaabaf;font-size:10px;font-weight:700;letter-spacing:1px;display:flex;align-items:center;gap:5px}
  .hud-dot{width:6px;height:6px;border-radius:3px}
  #status{position:fixed;bottom:8px;left:8px;z-index:1000;background:rgba(23,26,29,0.92);border:1px solid rgba(70,72,75,0.3);border-radius:8px;padding:4px 10px;color:#747579;font-size:9px;font-weight:700;letter-spacing:1.5px}
</style>
</head>
<body>
<div id="hud">
  <div class="hud-pill"><div class="hud-dot" style="background:#ff7351"></div><span id="vCount">0</span> VIOLATIONS</div>
  <div class="hud-pill"><div class="hud-dot" style="background:#fdd400"></div><span id="nCount">0</span> NAKAS</div>
</div>
<div id="status">CONNECTING...</div>
<div id="map"></div>
<script>
var API = '${apiBase}';
var map = L.map('map',{zoomControl:false,attributionControl:false}).setView([21.1458,79.0882],13);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:19}).addTo(map);
L.control.zoom({position:'bottomright'}).addTo(map);

var vMarkers=[],nMarkers=[],heat=null,pollCount=0;
var VC={DUI:'#ff7351',Speeding:'#8B5CF6',No_Helmet:'#ff9159',Signal_Jump:'#38bdf8',Overloading:'#4ade80',Wrong_Way:'#f43f5e'};

function vIcon(c){
  return L.divIcon({className:'',html:'<div style="width:12px;height:12px;border-radius:50%;background:'+c+';border:2px solid rgba(255,255,255,0.7);box-shadow:0 0 8px '+c+';"></div>',iconSize:[12,12],iconAnchor:[6,6]});
}
var nIcon=L.divIcon({className:'',html:'<div style="width:22px;height:22px;border-radius:50%;background:#fdd400;border:3px solid rgba(255,255,255,0.85);box-shadow:0 0 14px #fdd400;display:flex;align-items:center;justify-content:center;font-size:11px;">🚔</div>',iconSize:[22,22],iconAnchor:[11,11]});

function update(data){
  vMarkers.forEach(function(m){map.removeLayer(m)});vMarkers=[];
  nMarkers.forEach(function(m){map.removeLayer(m)});nMarkers=[];
  var hp=[];

  if(data.violations){
    data.violations.forEach(function(v){
      var c=VC[v.type]||'#38bdf8';
      var m=L.marker([v.latitude,v.longitude],{icon:vIcon(c)}).addTo(map);
      m.bindPopup('<div class="popup-v"><b>'+v.type.replace(/_/g,' ')+'</b><br>'+v.zone+'<br>'+((v.confidence||0)*100).toFixed(0)+'% conf</div>');
      vMarkers.push(m);
      hp.push([v.latitude,v.longitude,v.confidence||0.7]);
    });
  }

  if(data.active_nakas){
    data.active_nakas.forEach(function(n){
      var m=L.marker([n.latitude,n.longitude],{icon:nIcon}).addTo(map);
      m.bindPopup('<div class="popup-n"><b>'+(n.officer_name||n.officer_id)+'</b><br>Status: '+n.status+'</div>');
      nMarkers.push(m);
    });
  }

  if(heat)map.removeLayer(heat);
  if(hp.length>0){
    heat=L.heatLayer(hp,{radius:28,blur:22,maxZoom:16,gradient:{0.2:'#0ea5e9',0.5:'#f59e0b',0.8:'#ef4444',1:'#dc2626'}}).addTo(map);
  }

  document.getElementById('vCount').textContent=data.violation_count||vMarkers.length;
  document.getElementById('nCount').textContent=data.naka_count||nMarkers.length;
}

function poll(){
  pollCount++;
  document.getElementById('status').textContent='POLL #'+pollCount+' · '+new Date().toLocaleTimeString();
  fetch(API+'/api/sync/state')
    .then(function(r){return r.json()})
    .then(function(d){
      if(d.status==='success'){
        update(d);
        // Send data back to React Native for the feed panel
        try{window.ReactNativeWebView.postMessage(JSON.stringify(d))}catch(e){}
      }
    })
    .catch(function(e){
      document.getElementById('status').textContent='OFFLINE · '+e.message;
    });
}

// Also accept data from React Native postMessage
window.addEventListener('message',function(e){try{var d=JSON.parse(e.data);if(d.type==='sync')update(d.payload)}catch(err){}});
document.addEventListener('message',function(e){try{var d=JSON.parse(e.data);if(d.type==='sync')update(d.payload)}catch(err){}});

// Start polling
poll();
setInterval(poll,8000);
<\/script>
</body>
</html>
`;

export default function LiveMapScreen() {
  const webViewRef = useRef(null);
  const { officer } = useAuth();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [feed, setFeed] = useState([]);
  const [stats, setStats] = useState({ violations: 0, nakas: 0, officers: 0 });
  const [lastSync, setLastSync] = useState(null);
  const [deploying, setDeploying] = useState(false);

  // Also poll from React Native side for the feed panel
  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchFeed = useCallback(async () => {
    const data = await getSyncState();
    if (data.status === 'success') {
      processSyncData(data);
    }
  }, []);

  const processSyncData = (data) => {
    setStats({
      violations: data.violation_count || 0,
      nakas: data.naka_count || 0,
      officers: data.officer_count || 0,
    });
    setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    const items = [
      ...(data.violations || []).map((v, i) => ({
        id: `v-${Date.now()}-${i}`,
        type: 'violation',
        label: (v.type || 'VIOLATION').replace(/_/g, ' '),
        zone: v.zone || 'Unknown',
        conf: v.confidence,
        color: {
          DUI: '#ff7351', Speeding: '#8B5CF6', No_Helmet: '#ff9159',
          Signal_Jump: '#38bdf8', Overloading: '#4ade80', Wrong_Way: '#f43f5e',
        }[v.type] || '#38bdf8',
        time: new Date(v.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })),
      ...(data.active_nakas || []).map((n, i) => ({
        id: `n-${Date.now()}-${i}`,
        type: 'naka',
        label: 'CHECKPOINT ACTIVE',
        zone: n.officer_name || n.officer_id,
        color: '#fdd400',
        time: 'LIVE',
      })),
    ];
    setFeed(items.slice(0, 15));
  };

  // When WebView sends data back, update feed
  const onWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.status === 'success') processSyncData(data);
    } catch (e) {}
  };

  const handleDeployHere = async () => {
    setDeploying(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('GPS Required', 'Enable location to deploy.');
        setDeploying(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      await updateNakaStatus(
        officer?.badgeId || 'NP001',
        officer?.name || 'Officer',
        loc.coords.latitude,
        loc.coords.longitude,
        'active'
      );
      Alert.alert('NAKA DEPLOYED', 'Your checkpoint is live on the grid.');
      fetchFeed();
    } catch (e) {
      Alert.alert('ERROR', 'Failed to deploy. Check server connection.');
    }
    setDeploying(false);
  };

  const renderFeedItem = ({ item }) => (
    <View style={[styles.feedCard, { borderLeftColor: item.color }]}>
      <View style={styles.feedRow}>
        <View style={[styles.feedDot, { backgroundColor: item.color }]} />
        <View style={styles.feedText}>
          <Text style={styles.feedLabel}>{item.label}</Text>
          <Text style={styles.feedZone}>{item.zone}</Text>
        </View>
        <Text style={styles.feedTime}>{item.time}</Text>
      </View>
      {item.conf != null && (
        <View style={styles.confBar}>
          <View style={[styles.confFill, { width: `${(item.conf * 100)}%`, backgroundColor: item.color }]} />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Map takes full width on top portion */}
      <View style={styles.mapArea}>
        <WebView
          ref={webViewRef}
          source={{ html: buildMapHTML(API_BASE_URL) }}
          style={styles.map}
          onLoad={() => setMapLoaded(true)}
          onMessage={onWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          mixedContentMode="always"
          allowFileAccess
        />
        {!mapLoaded && (
          <View style={styles.mapOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.mapLoadText}>LOADING TACTICAL MAP...</Text>
          </View>
        )}

        {/* Deploy FAB on map */}
        <TouchableOpacity
          style={[styles.deployFab, deploying && { opacity: 0.6 }]}
          onPress={handleDeployHere}
          disabled={deploying}
          activeOpacity={0.85}
        >
          {deploying ? (
            <ActivityIndicator size="small" color={COLORS.onSecondary} />
          ) : (
            <>
              <Ionicons name="locate" size={16} color={COLORS.onSecondary} />
              <Text style={styles.deployFabText}>DEPLOY</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Feed Panel at bottom */}
      <View style={styles.feedPanel}>
        {/* Header */}
        <View style={styles.feedHeader}>
          <View style={styles.feedTitleRow}>
            <Text style={styles.feedTitle}>LIVE INCIDENT FEED</Text>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Ionicons name="warning" size={10} color={COLORS.error} />
              <Text style={[styles.statChipText, { color: COLORS.error }]}>{stats.violations}</Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="shield-checkmark" size={10} color={COLORS.secondary} />
              <Text style={[styles.statChipText, { color: COLORS.secondary }]}>{stats.nakas}</Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="people" size={10} color={COLORS.primary} />
              <Text style={[styles.statChipText, { color: COLORS.primary }]}>{stats.officers}</Text>
            </View>
            {lastSync && <Text style={styles.syncTime}>↻ {lastSync}</Text>}
          </View>
        </View>

        {/* Feed List */}
        <FlatList
          data={feed}
          keyExtractor={(item) => item.id}
          renderItem={renderFeedItem}
          contentContainerStyle={styles.feedList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyFeed}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.emptyText}>AWAITING DATA...</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },

  // ── Map Area (top 55%) ──
  mapArea: { flex: 6, position: 'relative' },
  map: { flex: 1, backgroundColor: COLORS.surface },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  mapLoadText: { fontSize: 10, fontWeight: '700', color: COLORS.onSurfaceVariant, letterSpacing: 2 },

  deployFab: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 8,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  deployFabText: { fontSize: 11, fontWeight: '900', color: COLORS.onSecondary, letterSpacing: 2 },

  // ── Feed Panel (bottom 45%) ──
  feedPanel: {
    flex: 4,
    backgroundColor: COLORS.surfaceContainer,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant + '20',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },

  feedHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant + '15',
  },
  feedTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  feedTitle: { fontSize: 11, fontWeight: '900', color: COLORS.onSurface, letterSpacing: 2 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.error + '22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error + '44',
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.error },
  liveText: { fontSize: 8, fontWeight: '900', color: COLORS.error, letterSpacing: 2 },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + '15',
  },
  statChipText: { fontSize: 11, fontWeight: '900' },
  syncTime: { fontSize: 9, color: COLORS.outlineVariant, marginLeft: 'auto' },

  feedList: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 16 },

  feedCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant + '10',
  },
  feedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedDot: { width: 8, height: 8, borderRadius: 4 },
  feedText: { flex: 1 },
  feedLabel: { fontSize: 11, fontWeight: '700', color: COLORS.onSurface, letterSpacing: 0.5 },
  feedZone: { fontSize: 9, color: COLORS.onSurfaceVariant, marginTop: 1 },
  feedTime: { fontSize: 9, fontWeight: '700', color: COLORS.outlineVariant },

  confBar: {
    height: 3,
    backgroundColor: COLORS.surfaceDim,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  confFill: { height: '100%', borderRadius: 2 },

  emptyFeed: { alignItems: 'center', paddingTop: 30, gap: 8 },
  emptyText: { fontSize: 9, fontWeight: '700', color: COLORS.outlineVariant, letterSpacing: 2 },
});
