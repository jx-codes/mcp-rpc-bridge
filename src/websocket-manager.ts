import WebSocket from 'ws';

export class WebSocketManager {
  private ws?: WebSocket;
  private url: string;
  private isConnecting = false;

  constructor(url: string) {
    this.url = url;
  }

  async ensureConnected(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    if (this.isConnecting) {
      // Wait for existing connection attempt
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      return;
    }

    await this.connect();
  }

  private async connect(): Promise<void> {
    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnecting = false;
        console.log('WebSocket connected to RPC server');
        resolve();
      };

      this.ws.onerror = (error) => {
        this.isConnecting = false;
        console.error('WebSocket error:', error);
        reject(new Error('WebSocket connection failed'));
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed, attempting reconnect...');
        // Auto-reconnect on unexpected close
        setTimeout(() => {
          if (!this.isConnecting) {
            this.connect().catch(err =>
              console.error('Reconnection failed:', err)
            );
          }
        }, 1000);
      };
    });
  }

  getWebSocket(): WebSocket {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    return this.ws;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
    }
  }
}