// main.ts
import { Preamble, WebSocketIOFlags } from './types';
import { getClientId } from './client';
import { sockets } from './websocket';

class WebSocketManager {
  private socket: WebSocket | null = null;
  private preamble: Preamble;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.preamble = this.createPreamble();
  }

  private createPreamble(): Preamble {
    const preamble: Preamble = {
      flags: "Default",
      system: {
        id: getClientId(),
      }
      // TODO: Implement auth here when required
      // username: "user@example.com",
      // password: "secure-password",
      // auth: {
      //   token: "your-auth-token"
      // }
    };
    return preamble;
  }

  public connect(): void {
    try {
      console.log('Connecting to WebSocket...');
      this.socket = new WebSocket(sockets.config, sockets.protocol);

      this.socket.addEventListener('open', this.onOpen.bind(this));
      this.socket.addEventListener('message', this.onMessage.bind(this));
      this.socket.addEventListener('error', this.onError.bind(this));
      this.socket.addEventListener('close', this.onClose.bind(this));
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.handleReconnect();
    }
  }

  private onOpen(event: Event): void {
    console.log('WebSocket connected successfully');
    this.reconnectAttempts = 0;

    // Send preamble immediately after connection
    this.sendPreamble();
  }

  private sendPreamble(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('Sending preamble:', this.preamble);
      this.socket.send(JSON.stringify(this.preamble));
    }
  }

  private onMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log('Received message:', data);

      // Handle handshake response
      if (data.type === 'handshake') {
        this.handleHandshake(data);
      }

      // Handle other message types
      // TODO: Implement your message handlers here
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  private handleHandshake(data: any): void {
    console.log('Handshake completed:', data);
    // TODO: Store handshake token if needed
    // localStorage.setItem('handshake-token', data.token);
  }

  private onError(event: Event): void {
    console.error('WebSocket error:', event);
  }

  private onClose(event: CloseEvent): void {
    console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
    this.socket = null;
    this.handleReconnect();
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  public send(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
  }

  public getConnectionState(): number {
    return this.socket?.readyState ?? WebSocket.CLOSED;
  }
}

// Initialize and connect
const wsManager = new WebSocketManager();
wsManager.connect();

// Example usage: Send a message after connection
setTimeout(() => {
  wsManager.send({
    type: 'test',
    payload: 'Hello from client'
  });
}, 2000);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  wsManager.disconnect();
});

// Export for use in other modules
export default wsManager;