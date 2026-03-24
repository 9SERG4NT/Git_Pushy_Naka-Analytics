import { API_BASE_URL } from './api';
import { useConnectionStore } from '../store';
import { generateMockIncident } from './mockData';

const WS_URL = API_BASE_URL.replace('http', 'ws') + '/ws';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = [];
    this.isConnected = false;
    this._reconnectTimer = null;
    this._pingTimer = null;
    this._mockTimer = null;
    this._reconnectAttempts = 0;
    this._maxReconnects = 5;
  }

  connect() {
    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(WS_URL);

        const timeout = setTimeout(() => {
          // Backend not available — start mock stream
          console.warn('[WS] Connection timeout, starting mock stream');
          this._startMockStream();
          useConnectionStore.getState().setConnected(false);
          resolve();
        }, 4000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this._reconnectAttempts = 0;
          useConnectionStore.getState().setConnected(true);
          this._startPing();
          console.log('[WS] Connected to server');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'pong') {
              useConnectionStore.getState().setHeartbeat();
              return;
            }
            this.listeners.forEach((fn) => fn(data));
          } catch (e) {
            console.error('[WS] Parse error:', e);
          }
        };

        this.ws.onerror = () => {
          clearTimeout(timeout);
          this.isConnected = false;
          useConnectionStore.getState().setConnected(false);
          this._startMockStream();
          resolve();
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          useConnectionStore.getState().setConnected(false);
          this._stopPing();
          this._scheduleReconnect();
        };
      } catch (error) {
        this._startMockStream();
        resolve();
      }
    });
  }

  _startMockStream() {
    if (this._mockTimer) return;
    console.log('[WS] Starting mock event stream');
    // Emit a mock violation every 8-15 seconds to simulate real-time feed
    const emit = () => {
      const incident = generateMockIncident();
      this.listeners.forEach((fn) =>
        fn({ type: 'violation_event', data: incident })
      );
      const next = 8000 + Math.random() * 7000;
      this._mockTimer = setTimeout(emit, next);
    };
    this._mockTimer = setTimeout(emit, 3000);
  }

  _stopMockStream() {
    if (this._mockTimer) {
      clearTimeout(this._mockTimer);
      this._mockTimer = null;
    }
  }

  _startPing() {
    this._pingTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000);
  }

  _stopPing() {
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }
  }

  _scheduleReconnect() {
    if (this._reconnectAttempts >= this._maxReconnects) {
      this._startMockStream();
      return;
    }
    const delay = Math.min(2000 * Math.pow(2, this._reconnectAttempts), 30000);
    this._reconnectAttempts++;
    this._reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  disconnect() {
    this._stopPing();
    this._stopMockStream();
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    useConnectionStore.getState().setConnected(false);
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  send(message) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

export const wsService = new WebSocketService();
export default wsService;
