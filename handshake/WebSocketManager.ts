// WebSocket Manager with Handshake Storage Integration

import { addHandshakeRecord } from '../utils/handshakeStorage';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(rawData: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(rawData);
      
      // Check if this is a handshake message
      if (message.type === 'handshake') {
        this.handleHandshake(message);
      }

      // Call registered handlers
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message);
      }

      // Call catch-all handler if registered
      const catchAllHandler = this.messageHandlers.get('*');
      if (catchAllHandler) {
        catchAllHandler(message);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  /**
   * Handle handshake messages - automatically stores in localStorage
   */
  private handleHandshake(data: any): void {
    console.log('Handshake completed:', data);
    
    // Automatically store the handshake record
    const record = addHandshakeRecord(data);
    
    console.log('Handshake stored with ID:', record.id);
    
    // Token is automatically stored separately by addHandshakeRecord
    if (data.token) {
      console.log('Token stored for future API calls');
    }
  }

  /**
   * Register a handler for a specific message type
   */
  on(messageType: string, handler: (data: any) => void): void {
    this.messageHandlers.set(messageType, handler);
  }

  /**
   * Unregister a handler
   */
  off(messageType: string): void {
    this.messageHandlers.delete(messageType);
  }

  /**
   * Send a message through WebSocket
   */
  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export default WebSocketManager;
