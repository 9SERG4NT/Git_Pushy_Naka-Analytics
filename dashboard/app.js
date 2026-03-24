/* ============================================
   NakaAnalytics Dashboard - App Logic
   v3 - Cluster-based redeployment, real confidence,
        persistent real-time updates
   ============================================ */

const API = window.location.origin;
const NAGPUR = [21.1458, 79.0882];

const ZONES = [
    { name: "Sitabuldi Main Road", lat: 21.1460, lon: 79.0680, type: "commercial" },
    { name: "Mahatma Gandhi Road", lat: 21.1400, lon: 79.0720, type: "commercial" },
    { name: "Dharampeth", lat: 21.1520, lon: 79.0750, type: "residential" },
    { name: "Civil Lines", lat: 21.1580, lon: 79.0850, type: "commercial" },
    { name: "Hanuman Nagar", lat: 21.1350, lon: 79.0950, type: "residential" },
    { name: "Sadar", lat: 21.1480, lon: 79.0620, type: "commercial" },
    { name: "Itwari", lat: 21.1300, lon: 79.0800, type: "market" },
    { name: "Mankapur", lat: 21.1650, lon: 79.0700, type: "residential" },
    { name: "Airport Road", lat: 21.0980, lon: 79.0500, type: "highway" },
    { name: "Koradi Road", lat: 21.1700, lon: 79.1100, type: "highway" },
    { name: "Kamptee Road", lat: 21.1750, lon: 79.0520, type: "highway" },
    { name: "Hingna Road", lat: 21.1000, lon: 79.0400, type: "industrial" },
];

const VTYPES = [
    { type: "DUI", color: "#ef4444", icon: "🍺" },
    { type: "Speeding", color: "#f59e0b", icon: "⚡" },
    { type: "No_Helmet", color: "#10b981", icon: "⛑️" },
    { type: "Signal_Jump", color: "#3b82f6", icon: "🚦" },
    { type: "Overloading", color: "#8b5cf6", icon: "📦" },
    { type: "Wrong_Way", color: "#ec4899", icon: "↩️" },
];

const CHART_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

const CHART_DEFAULTS = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "#94a3b8", font: { size: 10, family: "Inter" }, padding: 8 } } },
    scales: {
        x: { ticks: { color: "#64748b", font: { size: 9 } }, grid: { color: "rgba(148,163,184,0.08)" } },
        y: { ticks: { color: "#64748b", font: { size: 9 } }, grid: { color: "rgba(148,163,184,0.08)" } },
    },
};

/* ====== App State ====== */
const NakaApp = {
    map: null,
    recMarkers: [],
    heatLayer: null,
    heatVisible: false,
    recommendations: [],
    feedCount: 0,
    liveCharts: {},
    edaCharts: {},
    modelCharts: {},
    edaLoaded: false,
    modelLoaded: false,

    // Naka deployment state
    deployedNakas: [],          // { id, rank, marker, circle, lat, lon, targetLat, targetLon, type, vInfo, zone, violations, isMoving, confidence, yield }
    zoneViolationCounts: {},    // zone -> count in current window
    zoneViolationHistory: {},   // zone -> total violations seen
    nextNakaId: 1,
    violationMarkers: [],
    currentHotspots: [],        // from API
    selectedNakaRank: null,     // currently selected in sidebar
};

/* ====== Init ====== */
function init() {
    setupTabs();
    updateClock();
    setInterval(updateClock, 1000);
    initLiveMap();
    initLiveCharts();
    loadRecommendations();
    startSimulation();
    checkServerStatus();

    // Reset window counts every 15s
    setInterval(() => { NakaApp.zoneViolationCounts = {}; }, 15000);

    // Evaluate redeployment every 5s
    setInterval(evaluateNakaRedeployments, 5000);

    // Refresh recommendations from model every 60s
    setInterval(() => { loadRecommendations(); }, 60000);
}

/* ====== Tab Navigation ====== */
function setupTabs() {
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(`tab-${tab}`).classList.add("active");
            if (tab === "eda" && !NakaApp.edaLoaded) loadEDAData();
            if (tab === "model" && !NakaApp.modelLoaded) loadModelData();
            setTimeout(() => {
                Object.values(NakaApp.liveCharts).forEach(c => c?.resize?.());
                Object.values(NakaApp.edaCharts).forEach(c => c?.resize?.());
                Object.values(NakaApp.modelCharts).forEach(c => c?.resize?.());
                if (NakaApp.map) NakaApp.map.invalidateSize();
            }, 100);
        });
    });
}

function updateClock() {
    document.getElementById("live-clock").textContent = new Date().toLocaleTimeString("en-IN", { hour12: false });
}

async function checkServerStatus() {
    try {
        const r = await fetch(`${API}/health`);
        if (r.ok) document.getElementById("status-text").textContent = "System Online";
    } catch {
        document.getElementById("status-text").textContent = "Demo Mode";
        document.querySelector(".status-pill").style.borderColor = "rgba(245,158,11,0.25)";
        document.querySelector(".status-pill").style.color = "#f59e0b";
    }
}

/* ====== Live Map ====== */
function initLiveMap() {
    NakaApp.map = L.map("map", { zoomControl: true }).setView(NAGPUR, 13);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap © CARTO", subdomains: "abcd", maxZoom: 19,
    }).addTo(NakaApp.map);
    NakaApp.map.on("moveend", () => {
        const c = NakaApp.map.getCenter();
        document.getElementById("map-center").textContent = `${c.lat.toFixed(4)}° N, ${c.lng.toFixed(4)}° E`;
    });
}

NakaApp.toggleHeatmap = function () {
    const btn = document.getElementById("btn-heatmap");
    if (NakaApp.heatVisible && NakaApp.heatLayer) {
        NakaApp.map.removeLayer(NakaApp.heatLayer);
        NakaApp.heatVisible = false;
        btn.classList.remove("active-btn");
    } else {
        refreshHeatmapData();
        NakaApp.heatVisible = true;
        btn.classList.add("active-btn");
    }
};

/* ====== Real-time Heatmap Functions ====== */
function refreshHeatmapData(focusLat, focusLon) {
    const heatData = [];

    // Use live violation markers as heat points
    NakaApp.violationMarkers.forEach(m => {
        if (m._map) {
            const ll = m.getLatLng();
            heatData.push([ll.lat, ll.lng, 0.7]);
        }
    });

    // Add zone violation history as persistent heat
    ZONES.forEach(z => {
        const count = NakaApp.zoneViolationHistory[z.name] || 0;
        const intensity = Math.min(1.0, 0.1 + count / 50);
        heatData.push([z.lat, z.lon, intensity]);
    });

    // Add deployed naka positions as mild heat
    NakaApp.deployedNakas.forEach(n => {
        heatData.push([n.lat, n.lon, 0.3 + Math.min(n.violations * 0.05, 0.4)]);
    });

    // If there's a focus point, add extra emphasis
    if (focusLat && focusLon) {
        heatData.push([focusLat, focusLon, 0.9]);
        // Add nearby violations with boosted intensity
        NakaApp.violationMarkers.forEach(m => {
            if (m._map) {
                const ll = m.getLatLng();
                const d = Math.sqrt(Math.pow(ll.lat - focusLat, 2) + Math.pow(ll.lng - focusLon, 2));
                if (d < 0.008) heatData.push([ll.lat, ll.lng, 0.95]);
            }
        });
    }

    if (heatData.length === 0) {
        // Fallback: at least show zone-based data
        ZONES.forEach(z => heatData.push([z.lat, z.lon, 0.3 + Math.random() * 0.3]));
    }

    if (NakaApp.heatLayer) NakaApp.map.removeLayer(NakaApp.heatLayer);
    NakaApp.heatLayer = L.heatLayer(heatData, {
        radius: 30, blur: 25, maxZoom: 15,
        gradient: { 0.2: "#0ea5e9", 0.4: "#06b6d4", 0.6: "#f59e0b", 0.8: "#ef4444", 1: "#dc2626" }
    }).addTo(NakaApp.map);
}

function updateLiveHeatmap(focusLat, focusLon) {
    const btn = document.getElementById("btn-heatmap");
    refreshHeatmapData(focusLat, focusLon);
    NakaApp.heatVisible = true;
    btn.classList.add("active-btn");
}
NakaApp.centerMap = function () { NakaApp.map.setView(NAGPUR, 13); };

/* ====== Recommendations ====== */
async function loadRecommendations() {
    try {
        const r = await fetch(`${API}/api/recommendations?top_k=10`);
        const data = await r.json();
        if (data.recommendations) NakaApp.recommendations = data.recommendations;
        else NakaApp.recommendations = getDemoRecommendations();
    } catch { NakaApp.recommendations = getDemoRecommendations(); }

    renderRecommendations();
    if (NakaApp.deployedNakas.length === 0) deployInitialNakas();
}

NakaApp.refreshRecommendations = function () { loadRecommendations(); };

function getDemoRecommendations() {
    return [
        { rank: 1, naka_type: "DUI", location: { lat: 21.142, lon: 79.065 }, time_window: "22:00-02:00", expected_violation_yield: 0.38, confidence: 0.72 },
        { rank: 2, naka_type: "Speeding", location: { lat: 21.098, lon: 79.050 }, time_window: "23:00-04:00", expected_violation_yield: 0.35, confidence: 0.68 },
        { rank: 3, naka_type: "No_Helmet", location: { lat: 21.146, lon: 79.068 }, time_window: "07:00-10:00", expected_violation_yield: 0.32, confidence: 0.65 },
        { rank: 4, naka_type: "Signal_Jump", location: { lat: 21.148, lon: 79.075 }, time_window: "08:00-10:00", expected_violation_yield: 0.30, confidence: 0.62 },
        { rank: 5, naka_type: "Overloading", location: { lat: 21.100, lon: 79.040 }, time_window: "06:00-12:00", expected_violation_yield: 0.28, confidence: 0.60 },
    ];
}

function findClosestZone(lat, lon) {
    let closest = ZONES[0].name, minDist = Infinity;
    ZONES.forEach(z => {
        const d = Math.sqrt(Math.pow(z.lat - lat, 2) + Math.pow(z.lon - lon, 2));
        if (d < minDist) { minDist = d; closest = z.name; }
    });
    return closest;
}

function getZoneObj(name) {
    return ZONES.find(z => z.name === name) || ZONES[0];
}

/* ====== Render Top Deployments Sidebar ====== */
function renderRecommendations() {
    const el = document.getElementById("recommendations-list");
    el.innerHTML = "";
    const filter = document.getElementById("filter-violation").value;

    // Build display list from deployed nakas (real-time state), not just static recs
    let displayItems = NakaApp.deployedNakas.map(n => {
        const rec = NakaApp.recommendations.find(r => r.rank === n.rank) || {};
        return {
            rank: n.rank,
            type: n.type,
            vInfo: n.vInfo,
            zone: n.zone,
            lat: n.lat, lon: n.lon,
            isMoving: n.isMoving,
            confidence: n.confidence || rec.confidence || 0,
            yield: n.yield || rec.expected_violation_yield || 0,
            violations: n.violations || 0,
            timeWindow: rec.time_window || "Active",
        };
    });

    // If no deployed nakas yet, show from recommendations
    if (displayItems.length === 0) {
        displayItems = NakaApp.recommendations.map(rec => {
            const vInfo = VTYPES.find(v => v.type === rec.naka_type) || VTYPES[0];
            return {
                rank: rec.rank, type: rec.naka_type, vInfo,
                zone: findClosestZone(rec.location.lat, rec.location.lon),
                lat: rec.location.lat, lon: rec.location.lon,
                isMoving: false,
                confidence: rec.confidence, yield: rec.expected_violation_yield,
                violations: 0, timeWindow: rec.time_window,
            };
        });
    }

    // Apply filters
    if (filter !== "all") displayItems = displayItems.filter(d => d.type === filter);

    displayItems.forEach(item => {
        const confPct = (item.confidence * 100).toFixed(1);
        const yieldPct = (item.yield * 100).toFixed(1);

        // Confidence bar color gradient
        const confColor = item.confidence >= 0.75 ? "#10b981"
            : item.confidence >= 0.65 ? "#0ea5e9"
            : item.confidence >= 0.55 ? "#f59e0b" : "#ef4444";

        const div = document.createElement("div");
        div.className = "rec-item" + (item.isMoving ? " moving" : "");
        if (NakaApp.selectedNakaRank === item.rank) div.classList.add("selected");

        div.innerHTML = `
            <div class="rec-top">
                <span class="rank" style="background:${item.vInfo.color}">${item.rank}</span>
                <span class="type-name">${item.vInfo.icon} ${item.type.replace("_"," ")}</span>
                ${item.isMoving
                    ? '<span class="status-badge relocating">🔄 Relocating</span>'
                    : '<span class="status-badge active">● Active</span>'}
            </div>
            <div class="rec-info-grid">
                <div class="rec-info-cell">📍 <span class="info-val">${item.zone}</span></div>
                <div class="rec-info-cell">⏰ <span class="info-val">${item.timeWindow}</span></div>
                <div class="rec-info-cell">📈 <span class="info-val">${yieldPct}% yield</span></div>
                <div class="rec-info-cell">🚨 <span class="info-val">${item.violations} caught</span></div>
            </div>
            <div class="conf-bar-wrap">
                <span class="conf-label">Conf</span>
                <div class="conf-track">
                    <div class="conf-fill" style="width:${confPct}%;background:${confColor};"></div>
                </div>
                <span class="conf-pct" style="color:${confColor}">${confPct}%</span>
            </div>
        `;

        div.onclick = () => {
            NakaApp.selectedNakaRank = item.rank;
            NakaApp.map.setView([item.lat, item.lon], 15, { animate: true, duration: 0.8 });

            // Open the naka popup
            const naka = NakaApp.deployedNakas.find(n => n.rank === item.rank);
            if (naka && naka.marker) naka.marker.openPopup();

            // Auto-activate & update heatmap centered on this naka
            updateLiveHeatmap(item.lat, item.lon);

            // Update selected visual
            el.querySelectorAll(".rec-item").forEach(r => r.classList.remove("selected"));
            div.classList.add("selected");
        };

        el.appendChild(div);
    });

    document.getElementById("stat-nakas").textContent = NakaApp.deployedNakas.length || displayItems.length;
}

/* ====== Deploy Initial Nakas ====== */
function deployInitialNakas() {
    // Clear old
    NakaApp.recMarkers.forEach(m => { if (m._map) NakaApp.map.removeLayer(m); });
    NakaApp.recMarkers = [];
    NakaApp.deployedNakas.forEach(n => {
        if (n.marker && n.marker._map) NakaApp.map.removeLayer(n.marker);
        if (n.circle && n.circle._map) NakaApp.map.removeLayer(n.circle);
        if (n.animFrame) cancelAnimationFrame(n.animFrame);
    });
    NakaApp.deployedNakas = [];

    NakaApp.recommendations.slice(0, 8).forEach(rec => {
        const vInfo = VTYPES.find(v => v.type === rec.naka_type) || VTYPES[0];
        const lat = rec.location.lat, lon = rec.location.lon;

        const marker = L.marker([lat, lon], {
            icon: L.divIcon({
                className: "custom-marker",
                html: createNakaHtml(rec.rank, vInfo.color, false),
                iconSize: [36, 36],
            }),
        }).addTo(NakaApp.map);

        const zone = findClosestZone(lat, lon);
        marker.bindPopup(buildNakaPopup(rec.rank, rec.naka_type, vInfo, zone, rec.time_window, rec.expected_violation_yield, rec.confidence, 0));

        const circle = L.circle([lat, lon], {
            color: vInfo.color, fillColor: vInfo.color, fillOpacity: 0.08,
            radius: 350, weight: 1.5, dashArray: "5,5",
        }).addTo(NakaApp.map);

        NakaApp.recMarkers.push(marker, circle);
        NakaApp.deployedNakas.push({
            id: NakaApp.nextNakaId++,
            rank: rec.rank, marker, circle,
            lat, lon, targetLat: lat, targetLon: lon,
            type: rec.naka_type, vInfo, zone,
            violations: 0, isMoving: false, animFrame: null,
            confidence: rec.confidence,
            yield: rec.expected_violation_yield,
        });
    });
}

function createNakaHtml(rank, color, isMoving) {
    return `<div style="
        width:34px;height:34px;background:${color};border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:${isMoving ? '14' : '13'}px;color:white;font-weight:900;
        box-shadow:0 0 ${isMoving ? '20' : '10'}px ${color}${isMoving ? 'CC' : '80'}, 0 2px 8px rgba(0,0,0,0.5);
        border:2px solid ${isMoving ? '#fff' : 'rgba(255,255,255,0.4)'};
        transition:box-shadow 0.5s;
    ">${isMoving ? '🚔' : rank}</div>`;
}

function buildNakaPopup(rank, type, vInfo, zone, timeWindow, yieldVal, confidence, violations) {
    return `
        <div style="min-width:200px;font-family:Inter,sans-serif;">
            <h4 style="margin:0 0 6px;color:${vInfo.color};font-size:13px;">
                ${vInfo.icon} Naka #${rank}: ${type.replace("_"," ")}
            </h4>
            <p style="margin:3px 0;font-size:11px;color:#94a3b8;">
                <b>Zone:</b> ${zone}<br>
                <b>Time:</b> ${timeWindow}<br>
                <b>Yield:</b> ${(yieldVal * 100).toFixed(1)}%<br>
                <b>Confidence:</b> ${(confidence * 100).toFixed(1)}%<br>
                <b>Violations caught:</b> ${violations}
            </p>
        </div>`;
}

/* ====== Smooth Naka Animation ====== */
function animateNakaToTarget(naka) {
    if (naka.animFrame) cancelAnimationFrame(naka.animFrame);

    const startLat = naka.lat, startLon = naka.lon;
    const endLat = naka.targetLat, endLon = naka.targetLon;
    const duration = 4500;
    const startTime = performance.now();
    naka.isMoving = true;

    naka.marker.setIcon(L.divIcon({
        className: "custom-marker",
        html: createNakaHtml(naka.rank, naka.vInfo.color, true),
        iconSize: [36, 36],
    }));

    const trail = L.polyline([[startLat, startLon]], {
        color: naka.vInfo.color, weight: 2, opacity: 0.5, dashArray: "4,6",
    }).addTo(NakaApp.map);
    NakaApp.recMarkers.push(trail);

    function step(timestamp) {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const curLat = startLat + (endLat - startLat) * ease;
        const curLon = startLon + (endLon - startLon) * ease;
        naka.lat = curLat;
        naka.lon = curLon;
        naka.marker.setLatLng([curLat, curLon]);
        naka.circle.setLatLng([curLat, curLon]);
        trail.addLatLng([curLat, curLon]);

        if (progress < 1) {
            naka.animFrame = requestAnimationFrame(step);
        } else {
            naka.isMoving = false;
            naka.zone = findClosestZone(endLat, endLon);
            naka.violations = 0;

            naka.marker.setIcon(L.divIcon({
                className: "custom-marker",
                html: createNakaHtml(naka.rank, naka.vInfo.color, false),
                iconSize: [36, 36],
            }));

            // Update popup with real data
            naka.marker.setPopupContent(buildNakaPopup(
                naka.rank, naka.type, naka.vInfo, naka.zone,
                "Live", naka.yield, naka.confidence, naka.violations
            ));

            setTimeout(() => { if (trail._map) NakaApp.map.removeLayer(trail); }, 6000);

            addFeedItem({ type: naka.type, zone: naka.zone, timestamp: new Date().toISOString(), redeployed: true });
            renderRecommendations();
        }
    }
    naka.animFrame = requestAnimationFrame(step);
}

/* ====== Cluster-based Naka Redeployment ====== */
function evaluateNakaRedeployments() {
    if (NakaApp.deployedNakas.length === 0) return;

    const counts = { ...NakaApp.zoneViolationCounts };

    // Sort zones by violation count (descending)
    const zoneCounts = ZONES.map(z => ({
        name: z.name, lat: z.lat, lon: z.lon,
        count: counts[z.name] || 0,
    })).sort((a, b) => b.count - a.count);

    const hotZones = zoneCounts.filter(z => z.count >= 2);
    const coldZones = zoneCounts.filter(z => z.count === 0);

    if (hotZones.length === 0 || coldZones.length === 0) return;

    // Find nakas currently in cold zones (no violations nearby)
    const idleNakas = NakaApp.deployedNakas.filter(n => {
        if (n.isMoving) return false;
        const myCount = counts[n.zone] || 0;
        return myCount === 0;
    });

    if (idleNakas.length === 0) return;

    // For each hot zone, check if already served by a nearby naka
    for (const hotZone of hotZones) {
        const nakasNear = NakaApp.deployedNakas.filter(n => {
            const d = Math.sqrt(Math.pow(n.lat - hotZone.lat, 2) + Math.pow(n.lon - hotZone.lon, 2));
            return d < 0.006 && !n.isMoving;
        });

        // Only redeploy if hot zone is underserved
        if (nakasNear.length >= 2) continue;

        // Pick the closest idle naka to the hot zone
        let bestNaka = null, bestDist = Infinity;
        for (const naka of idleNakas) {
            if (naka.isMoving) continue;
            const d = Math.sqrt(Math.pow(naka.lat - hotZone.lat, 2) + Math.pow(naka.lon - hotZone.lon, 2));
            if (d < bestDist) { bestDist = d; bestNaka = naka; }
        }

        if (!bestNaka) continue;

        // Set target with slight random offset to avoid stacking
        const offset = (Math.random() - 0.5) * 0.004;
        bestNaka.targetLat = hotZone.lat + offset;
        bestNaka.targetLon = hotZone.lon + offset;

        addFeedItem({
            type: bestNaka.type,
            zone: `${bestNaka.zone} → ${hotZone.name}`,
            timestamp: new Date().toISOString(),
            redirecting: true,
        });

        animateNakaToTarget(bestNaka);
        renderRecommendations();

        // Remove this naka from idle list so we don't double-assign
        const idx = idleNakas.indexOf(bestNaka);
        if (idx > -1) idleNakas.splice(idx, 1);

        // Only move one naka per evaluation cycle to keep it visible
        break;
    }
}

/* ====== Live Charts ====== */
function initLiveCharts() {
    NakaApp.liveCharts.hourly = new Chart(document.getElementById("live-hourly-chart"), {
        type: "line",
        data: { labels: Array.from({ length: 24 }, (_, i) => `${i}h`), datasets: [{ label: "Violations", data: genHourlyData(), borderColor: "#0ea5e9", backgroundColor: "rgba(14,165,233,0.1)", fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2 }] },
        options: { ...CHART_DEFAULTS, plugins: { legend: { display: false } } },
    });
    NakaApp.liveCharts.violation = new Chart(document.getElementById("live-violation-chart"), {
        type: "doughnut",
        data: { labels: VTYPES.map(v => v.type), datasets: [{ data: [15, 25, 20, 18, 12, 10], backgroundColor: VTYPES.map(v => v.color), borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { color: "#94a3b8", font: { size: 9 }, padding: 6, boxWidth: 10 } } } },
    });
    NakaApp.liveCharts.zone = new Chart(document.getElementById("live-zone-chart"), {
        type: "bar",
        data: { labels: ZONES.slice(0, 6).map(z => z.name.split(" ")[0]), datasets: [{ data: Array(6).fill(0).map(() => Math.floor(Math.random() * 40) + 10), backgroundColor: CHART_COLORS.slice(0, 6).map(c => c + "B3"), borderRadius: 4 }] },
        options: { ...CHART_DEFAULTS, indexAxis: "y", plugins: { legend: { display: false } } },
    });
}

function genHourlyData() {
    return Array(24).fill(0).map((_, h) => {
        const isNight = h >= 22 || h <= 4;
        const isRush = (h >= 7 && h <= 10) || (h >= 17 && h <= 19);
        return (isNight ? 35 : isRush ? 45 : 20) + Math.floor(Math.random() * 20);
    });
}

/* ====== Persistent Live Simulation ====== */
function startSimulation() {
    // Main simulation loop - fetches violations every 3s
    // Uses async/await with error recovery so it NEVER stops
    async function simulationTick() {
        try {
            const r = await fetch(`${API}/api/simulate/violations`);
            const data = await r.json();
            if (data.violations) {
                NakaApp.currentHotspots = data.hotspot_zones || [];
                data.violations.forEach(v => {
                    processViolation(v);
                });
            }
        } catch (err) {
            // Fallback: client-side sim - never let it stop
            const zone = ZONES[Math.floor(Math.random() * ZONES.length)];
            const vtype = VTYPES[Math.floor(Math.random() * VTYPES.length)];
            processViolation({
                type: vtype.type, zone: zone.name,
                latitude: zone.lat + (Math.random() - 0.5) * 0.006,
                longitude: zone.lon + (Math.random() - 0.5) * 0.006,
                timestamp: new Date().toISOString(),
                confidence: Math.random() * 0.3 + 0.55,
            });
        }
    }

    // Run immediately, then every 3s - using setInterval for reliability
    simulationTick();
    setInterval(simulationTick, 3000);

    // Update live charts every 8s
    setInterval(() => {
        if (NakaApp.liveCharts.hourly) {
            NakaApp.liveCharts.hourly.data.datasets[0].data = genHourlyData();
            NakaApp.liveCharts.hourly.update("none");
        }
        if (NakaApp.liveCharts.zone) {
            const names = ZONES.slice(0, 6).map(z => z.name);
            NakaApp.liveCharts.zone.data.datasets[0].data = names.map(n => (NakaApp.zoneViolationHistory[n] || 0));
            NakaApp.liveCharts.zone.update("none");
        }
    }, 8000);

    // Update violation type chart every 10s
    setInterval(() => {
        if (NakaApp.liveCharts.violation) {
            const typeCounts = {};
            VTYPES.forEach(v => { typeCounts[v.type] = 0; });
            NakaApp.violationMarkers.forEach(m => {
                if (m._vtype) typeCounts[m._vtype] = (typeCounts[m._vtype] || 0) + 1;
            });
            NakaApp.liveCharts.violation.data.datasets[0].data = VTYPES.map(v => typeCounts[v.type] || 1);
            NakaApp.liveCharts.violation.update("none");
        }
    }, 10000);

    // Periodically re-render sidebar to update violation counts and status
    setInterval(renderRecommendations, 4000);

    // Auto-refresh heatmap if visible every 8s
    setInterval(() => {
        if (NakaApp.heatVisible) refreshHeatmapData();
    }, 8000);
}

/* ====== Process Each Violation ====== */
function processViolation(v) {
    addFeedItem(v);
    addViolationMarker(v);

    // Track zone counts
    const zone = v.zone || findClosestZone(v.latitude, v.longitude);
    NakaApp.zoneViolationCounts[zone] = (NakaApp.zoneViolationCounts[zone] || 0) + 1;
    NakaApp.zoneViolationHistory[zone] = (NakaApp.zoneViolationHistory[zone] || 0) + 1;

    // Check if any deployed naka is near this violation — increment its catch count
    const vLat = v.latitude || v.lat;
    const vLon = v.longitude || v.lon;
    if (vLat && vLon) {
        NakaApp.deployedNakas.forEach(n => {
            const d = Math.sqrt(Math.pow(n.lat - vLat, 2) + Math.pow(n.lon - vLon, 2));
            if (d < 0.005) {
                n.violations++;
                // Update popup if not moving
                if (!n.isMoving) {
                    n.marker.setPopupContent(buildNakaPopup(
                        n.rank, n.type, n.vInfo, n.zone,
                        "Live", n.yield, n.confidence, n.violations
                    ));
                }
            }
        });
    }
}

function addViolationMarker(v) {
    const vInfo = VTYPES.find(t => t.type === v.type) || VTYPES[0];
    const lat = v.latitude || v.lat;
    const lon = v.longitude || v.lon;
    if (!lat || !lon) return;

    const m = L.circleMarker([lat, lon], {
        radius: 5, color: vInfo.color, fillColor: vInfo.color, fillOpacity: 0.7, weight: 1,
    }).addTo(NakaApp.map);

    const confStr = v.confidence ? `<br>🎯 ${(v.confidence * 100).toFixed(1)}%` : "";
    m.bindPopup(`<b>${vInfo.icon} ${v.type}</b><br>📍 ${v.zone || "Unknown"}<br>🚗 ${v.vehicle_class || "—"}${confStr}`);
    m._vtype = v.type;

    NakaApp.violationMarkers.push(m);

    // Remove after 20s
    setTimeout(() => {
        if (m._map) NakaApp.map.removeLayer(m);
        NakaApp.violationMarkers = NakaApp.violationMarkers.filter(x => x !== m);
    }, 20000);
}

function addFeedItem(v) {
    const feed = document.getElementById("live-feed-list");
    const vInfo = VTYPES.find(t => t.type === v.type) || VTYPES[0];
    const time = v.timestamp ? new Date(v.timestamp).toLocaleTimeString("en-IN", { hour12: false }) : new Date().toLocaleTimeString("en-IN", { hour12: false });

    let label = `${vInfo.icon} ${v.type}`;
    let borderColor = vInfo.color;
    if (v.redeployed) { label = `🚔 ${v.type} — DEPLOYED`; borderColor = "#10b981"; }
    if (v.redirecting) { label = `🔄 Naka Relocating`; borderColor = "#f59e0b"; }

    const confStr = v.confidence ? ` · 🎯 ${(v.confidence * 100).toFixed(1)}%` : "";

    const div = document.createElement("div");
    div.className = "feed-item";
    div.style.borderLeftColor = borderColor;
    div.innerHTML = `
        <div class="feed-type" style="color:${borderColor}">${label}</div>
        <div class="feed-zone">📍 ${v.zone || "Unknown"}${confStr}</div>
        <div class="feed-time">🕐 ${time}</div>
    `;

    feed.insertBefore(div, feed.firstChild);
    if (feed.children.length > 50) feed.removeChild(feed.lastChild);

    NakaApp.feedCount++;
    document.getElementById("feed-badge").textContent = NakaApp.feedCount;
    document.getElementById("stat-violations").textContent = NakaApp.feedCount;
}

/* ====== EDA Data Loading ====== */
async function loadEDAData() {
    try {
        const r = await fetch(`${API}/api/eda/full`);
        const json = await r.json();
        if (json.status !== "success") throw new Error("EDA fail");
        const d = json.data;

        document.getElementById("eda-total").textContent = d.total_records.toLocaleString();
        const peakH = Object.entries(d.hourly).reduce((a, b) => (b[1] > a[1] ? b : a));
        document.getElementById("eda-peak-hour").textContent = `${peakH[0]}:00`;
        const peakD = Object.entries(d.day_of_week).reduce((a, b) => (b[1] > a[1] ? b : a));
        document.getElementById("eda-peak-dow").textContent = peakD[0];
        const topW = Object.entries(d.weather_counts).reduce((a, b) => (b[1] > a[1] ? b : a));
        document.getElementById("eda-weather-top").textContent = topW[0];
        document.getElementById("eda-holiday-count").textContent = (d.holiday?.Holiday || 0).toLocaleString();
        document.getElementById("eda-geo").textContent = `${d.geo_bounds.lat_min.toFixed(2)}°-${d.geo_bounds.lat_max.toFixed(2)}°`;

        const hours = Object.keys(d.hourly).map(Number).sort((a, b) => a - b);
        NakaApp.edaCharts.hourly = new Chart(document.getElementById("eda-hourly-chart"), {
            type: "bar", data: { labels: hours.map(h => `${h}:00`), datasets: [{ label: "Violations", data: hours.map(h => d.hourly[h] || 0), backgroundColor: hours.map(h => { if (h >= 22 || h <= 4) return "rgba(239,68,68,0.7)"; if ((h >= 7 && h <= 10) || (h >= 17 && h <= 19)) return "rgba(245,158,11,0.7)"; return "rgba(14,165,233,0.5)"; }), borderRadius: 4 }] },
            options: { ...CHART_DEFAULTS, plugins: { legend: { display: false } } },
        });
        NakaApp.edaCharts.violationPie = new Chart(document.getElementById("eda-violation-pie"), {
            type: "doughnut", data: { labels: Object.keys(d.violation_counts), datasets: [{ data: Object.values(d.violation_counts), backgroundColor: CHART_COLORS.slice(0, Object.keys(d.violation_counts).length), borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { color: "#94a3b8", font: { size: 10 }, padding: 6 } } } },
        });
        const dowLabels = Object.keys(d.day_of_week);
        NakaApp.edaCharts.dow = new Chart(document.getElementById("eda-dow-chart"), {
            type: "bar", data: { labels: dowLabels, datasets: [{ data: dowLabels.map(l => d.day_of_week[l]), backgroundColor: CHART_COLORS.slice(0, 7).map(c => c + "B3"), borderRadius: 4 }] },
            options: { ...CHART_DEFAULTS, plugins: { legend: { display: false } } },
        });
        const vcLabels = Object.keys(d.vehicle_counts);
        NakaApp.edaCharts.vehicle = new Chart(document.getElementById("eda-vehicle-chart"), {
            type: "polarArea", data: { labels: vcLabels, datasets: [{ data: vcLabels.map(l => d.vehicle_counts[l]), backgroundColor: CHART_COLORS.slice(0, vcLabels.length).map(c => c + "B3") }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { color: "#94a3b8", font: { size: 10 }, padding: 6 } } }, scales: { r: { ticks: { color: "#64748b" }, grid: { color: "rgba(148,163,184,0.1)" } } } },
        });
        const wLabels = Object.keys(d.weather_counts);
        NakaApp.edaCharts.weather = new Chart(document.getElementById("eda-weather-chart"), {
            type: "bar", data: { labels: wLabels, datasets: [{ label: "Violations", data: wLabels.map(l => d.weather_counts[l]), backgroundColor: ["#0ea5e9B3", "#f59e0bB3", "#64748bB3", "#8b5cf6B3"], borderRadius: 4 }] },
            options: { ...CHART_DEFAULTS, plugins: { legend: { display: false } } },
        });
        if (d.heatmap) {
            const datasets = d.heatmap.labels_y.map((vtype, idx) => ({
                label: vtype, data: d.heatmap.values[idx], backgroundColor: (CHART_COLORS[idx % CHART_COLORS.length]) + "B3", borderRadius: 2,
            }));
            NakaApp.edaCharts.heatmap = new Chart(document.getElementById("eda-heatmap-chart"), {
                type: "bar", data: { labels: d.heatmap.labels_x.map(h => `${h}:00`), datasets },
                options: { ...CHART_DEFAULTS, scales: { x: { stacked: true, ticks: { color: "#64748b", font: { size: 8 }, maxRotation: 0 }, grid: { color: "rgba(148,163,184,0.05)" } }, y: { stacked: true, ticks: { color: "#64748b", font: { size: 9 } }, grid: { color: "rgba(148,163,184,0.05)" } } }, plugins: { legend: { labels: { color: "#94a3b8", font: { size: 9 }, padding: 6, boxWidth: 10 } } } },
            });
        }
        NakaApp.edaLoaded = true;
    } catch (e) { console.error("EDA load error:", e); }
}

/* ====== Model Data Loading ====== */
async function loadModelData() {
    try {
        const r = await fetch(`${API}/api/model/details`);
        const json = await r.json();
        if (json.status !== "success") throw new Error("Model fail");
        const m = json.model;

        document.getElementById("model-n-records").textContent = (m.n_records || 0).toLocaleString();
        document.getElementById("model-n-features").textContent = m.n_features || "—";
        document.getElementById("model-n-classes").textContent = m.n_classes || "—";
        document.getElementById("model-n-clusters").textContent = m.n_clusters || "—";
        if (m.xgboost_params) {
            document.getElementById("p-depth").textContent = m.xgboost_params.max_depth;
            document.getElementById("p-lr").textContent = m.xgboost_params.learning_rate;
            document.getElementById("p-nest").textContent = m.xgboost_params.n_estimators;
            document.getElementById("p-obj").textContent = m.xgboost_params.objective;
        }
        // Populate evaluation results
        if (m.evaluation) {
            const e = m.evaluation;
            document.getElementById("eval-accuracy").textContent = (e.accuracy * 100).toFixed(1) + "%";
            document.getElementById("eval-precision").textContent = (e.precision_at_5 * 100).toFixed(1) + "%";
            document.getElementById("eval-recall").textContent = (e.recall_at_5 * 100).toFixed(1) + "%";
            document.getElementById("eval-f1").textContent = (e.f1_score * 100).toFixed(1) + "%";
            document.getElementById("eval-hitrate").textContent = (e.hit_rate * 100).toFixed(1) + "%";
            document.getElementById("eval-uplift").textContent = "+" + (e.uplift * 100).toFixed(1) + "%";
        }
        const classList = document.getElementById("model-classes-list");
        classList.innerHTML = "";
        (m.classes || []).forEach(cls => {
            const vi = VTYPES.find(v => v.type === cls);
            const tag = document.createElement("span");
            tag.className = "class-tag";
            tag.textContent = `${vi?.icon || "📋"} ${cls}`;
            classList.appendChild(tag);
        });
        if (m.feature_importance) {
            NakaApp.modelCharts.fi = new Chart(document.getElementById("model-fi-chart"), {
                type: "bar", data: { labels: m.feature_importance.names.map(n => n.replace(/_/g, " ")), datasets: [{ label: "Importance", data: m.feature_importance.values, backgroundColor: m.feature_importance.names.map((_, i) => CHART_COLORS[i % CHART_COLORS.length] + "B3"), borderRadius: 4 }] },
                options: { ...CHART_DEFAULTS, indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { ticks: { color: "#64748b", font: { size: 9 } }, grid: { color: "rgba(148,163,184,0.08)" } }, y: { ticks: { color: "#94a3b8", font: { size: 10 } }, grid: { display: false } } } },
            });
        }
        try {
            const edaR = await fetch(`${API}/api/eda/summary`);
            const edaJson = await edaR.json();
            if (edaJson.summary?.violation_counts) {
                const vc = edaJson.summary.violation_counts;
                NakaApp.modelCharts.classDist = new Chart(document.getElementById("model-class-chart"), {
                    type: "doughnut", data: { labels: Object.keys(vc), datasets: [{ data: Object.values(vc), backgroundColor: CHART_COLORS, borderWidth: 0 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { color: "#94a3b8", font: { size: 9 }, padding: 6, boxWidth: 10 } } } },
                });
            }
        } catch {}
        NakaApp.modelLoaded = true;
    } catch (e) { console.error("Model load error:", e); }
}

/* ====== Filter handlers & Init ====== */
document.addEventListener("DOMContentLoaded", () => {
    init();
    document.getElementById("filter-violation")?.addEventListener("change", renderRecommendations);
    document.getElementById("filter-time")?.addEventListener("change", renderRecommendations);
    startSyncPolling();
});

window.NakaApp = NakaApp;

/* ============================================
   Three.js 3D Visualization
   ============================================ */

NakaApp.threeScene = null;
NakaApp.threeCamera = null;
NakaApp.threeRenderer = null;
NakaApp.threeActive = false;
NakaApp.threeBars = [];
NakaApp.threeOfficers = [];
NakaApp.threeParticles = [];
NakaApp.threeAnimId = null;
NakaApp.syncOfficerMarkers = [];

// Zone violation tracking for 3D
NakaApp.zoneBarData = {};
ZONES.forEach(z => { NakaApp.zoneBarData[z.name] = { count: 0, targetH: 0.3 }; });

NakaApp.toggle3DView = function() {
    const container = document.getElementById("three-container");
    const btn = document.getElementById("btn-3d");
    const mapEl = document.getElementById("map");

    if (!NakaApp.threeActive) {
        container.style.display = "block";
        mapEl.style.visibility = "hidden";
        btn.classList.add("active-btn");
        NakaApp.threeActive = true;
        if (!NakaApp.threeScene) init3DScene();
        animate3D();
    } else {
        container.style.display = "none";
        mapEl.style.visibility = "visible";
        btn.classList.remove("active-btn");
        NakaApp.threeActive = false;
        if (NakaApp.threeAnimId) cancelAnimationFrame(NakaApp.threeAnimId);
    }
};

function init3DScene() {
    const canvas = document.getElementById("three-canvas");
    const container = document.getElementById("three-container");
    const w = container.clientWidth;
    const h = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f1a);
    scene.fog = new THREE.FogExp2(0x0b0f1a, 0.012);
    NakaApp.threeScene = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 1000);
    camera.position.set(35, 30, 35);
    camera.lookAt(0, 0, 0);
    NakaApp.threeCamera = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    NakaApp.threeRenderer = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x334466, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);
    const pointLight = new THREE.PointLight(0xffd600, 0.5, 80);
    pointLight.position.set(0, 20, 0);
    scene.add(pointLight);

    // Ground grid
    const gridHelper = new THREE.GridHelper(80, 40, 0x1e3a5f, 0x0d1b2a);
    scene.add(gridHelper);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x0d1b2a, transparent: true, opacity: 0.8 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);

    // Create bars for each zone
    ZONES.forEach((z, i) => {
        // Map lat/lon to 3D coords (centered around Nagpur)
        const x = (z.lon - 79.0882) * 2000;
        const zPos = (z.lat - 21.1458) * -2000;

        // Bar
        const barGeo = new THREE.BoxGeometry(1.5, 1, 1.5);
        const hue = (i / ZONES.length) * 0.3; // blue to green range
        const barMat = new THREE.MeshPhongMaterial({
            color: new THREE.Color().setHSL(hue, 0.8, 0.5),
            emissive: new THREE.Color().setHSL(hue, 0.9, 0.15),
            transparent: true,
            opacity: 0.85,
        });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set(x, 0.5, zPos);
        bar.castShadow = true;
        bar.userData = { zone: z.name, zoneData: z };
        scene.add(bar);

        // Glow ring at base
        const ringGeo = new THREE.RingGeometry(1.0, 1.6, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: barMat.color.clone(),
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, 0.02, zPos);
        scene.add(ring);

        // Zone label (floating text sprite)
        const labelCanvas = document.createElement("canvas");
        labelCanvas.width = 256;
        labelCanvas.height = 64;
        const ctx = labelCanvas.getContext("2d");
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 22px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(z.name.length > 15 ? z.name.substring(0, 15) + "…" : z.name, 128, 40);
        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true, opacity: 0.6 });
        const labelSprite = new THREE.Sprite(labelMat);
        labelSprite.scale.set(6, 1.5, 1);
        labelSprite.position.set(x, 0.2, zPos - 1.5);
        scene.add(labelSprite);

        NakaApp.threeBars.push({ mesh: bar, ring, label: labelSprite, zone: z, x, z: zPos, targetH: 0.3 });
    });

    // Resize handler
    window.addEventListener("resize", () => {
        if (!NakaApp.threeActive) return;
        const w2 = container.clientWidth;
        const h2 = container.clientHeight;
        camera.aspect = w2 / h2;
        camera.updateProjectionMatrix();
        renderer.setSize(w2, h2);
    });
}

function animate3D() {
    if (!NakaApp.threeActive) return;
    NakaApp.threeAnimId = requestAnimationFrame(animate3D);

    const time = Date.now() * 0.001;

    // Orbit camera
    const radius = 40;
    NakaApp.threeCamera.position.x = Math.cos(time * 0.08) * radius;
    NakaApp.threeCamera.position.z = Math.sin(time * 0.08) * radius;
    NakaApp.threeCamera.position.y = 25 + Math.sin(time * 0.15) * 5;
    NakaApp.threeCamera.lookAt(0, 2, 0);

    // Animate bars toward target heights
    NakaApp.threeBars.forEach(b => {
        const zoneData = NakaApp.zoneBarData[b.zone.name] || { count: 0 };
        const targetH = Math.max(0.5, zoneData.count * 1.2);
        const currentH = b.mesh.scale.y;
        b.mesh.scale.y += (targetH - currentH) * 0.05;
        b.mesh.position.y = b.mesh.scale.y * 0.5;

        // Pulse emissive
        const pulse = 0.15 + Math.sin(time * 2 + b.x) * 0.05;
        b.mesh.material.emissive.setHSL(b.mesh.material.emissive.getHSL({}).h, 0.9, pulse);

        // Animate ring opacity
        b.ring.material.opacity = 0.15 + Math.sin(time * 3 + b.z) * 0.1;

        // Update label position
        b.label.position.y = b.mesh.scale.y + 1.5;
    });

    // Animate officer spheres
    NakaApp.threeOfficers.forEach(o => {
        o.mesh.position.y = 2 + Math.sin(time * 2 + o.mesh.position.x) * 0.5;
        o.glow.material.opacity = 0.2 + Math.sin(time * 3) * 0.1;
    });

    // Animate particles
    NakaApp.threeParticles = NakaApp.threeParticles.filter(p => {
        p.mesh.position.y -= p.speed;
        p.life -= 0.02;
        p.mesh.material.opacity = p.life;
        if (p.life <= 0) {
            NakaApp.threeScene.remove(p.mesh);
            return false;
        }
        return true;
    });

    NakaApp.threeRenderer.render(NakaApp.threeScene, NakaApp.threeCamera);
}

function addViolationParticle3D(lat, lon, color) {
    if (!NakaApp.threeScene) return;
    const x = (lon - 79.0882) * 2000;
    const z = (lat - 21.1458) * -2000;

    const geo = new THREE.SphereGeometry(0.3, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 1 });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.set(x + (Math.random() - 0.5) * 2, 15, z + (Math.random() - 0.5) * 2);
    NakaApp.threeScene.add(sphere);
    NakaApp.threeParticles.push({ mesh: sphere, speed: 0.15 + Math.random() * 0.1, life: 1.0 });
}

function updateOfficers3D(nakas) {
    if (!NakaApp.threeScene) return;

    // Remove old
    NakaApp.threeOfficers.forEach(o => {
        NakaApp.threeScene.remove(o.mesh);
        NakaApp.threeScene.remove(o.glow);
    });
    NakaApp.threeOfficers = [];

    nakas.forEach(n => {
        const x = (n.longitude - 79.0882) * 2000;
        const z = (n.latitude - 21.1458) * -2000;

        // Officer sphere
        const sphereGeo = new THREE.SphereGeometry(0.7, 16, 16);
        const sphereMat = new THREE.MeshPhongMaterial({
            color: 0xffd600,
            emissive: 0xffd600,
            emissiveIntensity: 0.4,
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.set(x, 2, z);
        sphere.castShadow = true;
        NakaApp.threeScene.add(sphere);

        // Glow
        const glowGeo = new THREE.SphereGeometry(1.2, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd600, transparent: true, opacity: 0.2 });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.set(x, 2, z);
        NakaApp.threeScene.add(glow);

        NakaApp.threeOfficers.push({ mesh: sphere, glow, data: n });
    });
}

/* ====== Sync Polling ====== */
function startSyncPolling() {
    pollSyncState();
    setInterval(pollSyncState, 5000);
}

async function pollSyncState() {
    try {
        const r = await fetch(`${API}/api/sync/state`);
        const data = await r.json();
        if (data.status !== "success") return;

        // Update officer markers on 2D map
        NakaApp.syncOfficerMarkers.forEach(m => NakaApp.map.removeLayer(m));
        NakaApp.syncOfficerMarkers = [];
        (data.active_nakas || []).forEach(n => {
            const icon = L.divIcon({
                className: "",
                html: `<div style="width:20px;height:20px;border-radius:50%;background:#ffd600;border:3px solid #fff;box-shadow:0 0 10px #ffd600;display:flex;align-items:center;justify-content:center;font-size:10px">🚔</div>`,
                iconSize: [20, 20], iconAnchor: [10, 10],
            });
            const m = L.marker([n.latitude, n.longitude], { icon }).addTo(NakaApp.map);
            m.bindPopup(`<b>${n.officer_name || n.officer_id}</b><br>Status: ${n.status}<br>Since: ${new Date(n.activated_at).toLocaleTimeString()}`);
            NakaApp.syncOfficerMarkers.push(m);
        });

        // Update naka count
        document.getElementById("stat-nakas").textContent = data.naka_count || 0;

        // Update 3D scene
        if (NakaApp.threeActive) {
            updateOfficers3D(data.active_nakas || []);

            // Update zone bar heights from violations
            (data.violations || []).forEach(v => {
                if (NakaApp.zoneBarData[v.zone]) {
                    NakaApp.zoneBarData[v.zone].count += 1;
                }
                // Spawn particle
                const vColor = VTYPES.find(vt => vt.type === v.type)?.color || "#40C4FF";
                addViolationParticle3D(v.latitude, v.longitude, vColor);
            });
        }
    } catch (e) {
        // Silently fail
    }
}
