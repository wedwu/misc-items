// -------------------------------------------------------------
// StrictMode-safe WebSocketService (Singleton)
// -------------------------------------------------------------

type MessageHandler = (data: any) => void;

class WebSocketService {
  private static instance: WebSocketService;

  private ws: WebSocket | null = null;
  private url: string | null = null;

  private listeners = new Set<MessageHandler>();
  private messageQueue: string[] = [];

  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;

  private isConnecting = false;
  private isManuallyClosed = false;

  private readonly RECONNECT_DELAY = 2000;
  private readonly HEARTBEAT_INTERVAL = 20000;

  private constructor() {}

  static getInstance() {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  // -------------------------------------------------------------
  // CONNECT — SAFE TO CALL MULTIPLE TIMES
  // -------------------------------------------------------------
  connect(url: string) {
    // Already connected to same URL → no-op
    if (this.ws?.readyState === WebSocket.OPEN && this.url === url) {
      return;
    }

    // Prevent double connection attempts
    if (this.isConnecting) return;

    this.isConnecting = true;
    this.isManuallyClosed = false;
    this.url = url;

    console.log("[WS] Connecting →", url);

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      console.log("[WS] Connected");
      this.isConnecting = false;

      // Flush queued messages
      this.messageQueue.forEach((m) => ws.send(m));
      this.messageQueue = [];

      this.startHeartbeat();
    };

    ws.onmessage = (event) => {
      const data = this.safeParse(event.data);
      this.listeners.forEach((cb) => cb(data));
    };

    ws.onclose = () => {
      console.log("[WS] Closed");

      this.isConnecting = false;
      this.stopHeartbeat();
      this.ws = null;

      if (!this.isManuallyClosed) {
        this.scheduleReconnect();
      }
    };

    ws.onerror = () => {
      console.error("[WS] Error");
      ws.close(); // triggers onclose
    };
  }

  // -------------------------------------------------------------
  // SEND
  // -------------------------------------------------------------
  send(payload: any) {
    const msg =
      typeof payload === "string" ? payload : JSON.stringify(payload);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    } else {
      this.messageQueue.push(msg);
    }
  }

  // -------------------------------------------------------------
  // SUBSCRIBE
  // -------------------------------------------------------------
  subscribe(handler: MessageHandler) {
    this.listeners.add(handler);

    return () => {
      this.listeners.delete(handler);
    };
  }

  // -------------------------------------------------------------
  // HEARTBEAT
  // -------------------------------------------------------------
  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatTimer = window.setInterval(() => {
      this.send({ type: "ping" });
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // -------------------------------------------------------------
  // RECONNECT
  // -------------------------------------------------------------
  private scheduleReconnect() {
    if (this.reconnectTimer || !this.url) return;

    console.log("[WS] Reconnecting in 2s…");

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.url!);
    }, this.RECONNECT_DELAY);
  }

  // -------------------------------------------------------------
  // CLOSE (explicit, not StrictMode cleanup)
  // -------------------------------------------------------------
  close() {
    console.log("[WS] Manual close");

    this.isManuallyClosed = true;
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.ws?.close();
    this.ws = null;
  }

  // -------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------
  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // -------------------------------------------------------------
  // UTIL
  // -------------------------------------------------------------
  private safeParse(raw: string) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
}

export const wsService = WebSocketService.getInstance();
