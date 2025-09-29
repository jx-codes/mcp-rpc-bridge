import WebSocket from 'ws';

export interface RpcMessage {
  method: string;
  args: unknown;
  id?: string;
}

export interface ScriptMessage {
  script: string;
  id?: string;
}

export interface RpcResponse {
  result?: unknown;
  error?: string;
  id: string;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export class MessageCorrelator {
  private pendingRequests = new Map<string, PendingRequest>();

  private generateId(): string {
    return `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async sendAndWait<T>(
    ws: WebSocket,
    message: RpcMessage | ScriptMessage,
    timeout = 30000
  ): Promise<T> {
    const id = this.generateId();
    message.id = id;

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${id}`));
      }, timeout);

      // Store the pending request
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout: timeoutHandle
      });

      // Set up message handler if not already set
      if (!ws.listenerCount('message')) {
        ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data);
        });
      }

      // Send the message
      ws.send(JSON.stringify(message));
    });
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const response: RpcResponse = JSON.parse(data.toString());

      if (response.id && this.pendingRequests.has(response.id)) {
        const request = this.pendingRequests.get(response.id)!;
        this.pendingRequests.delete(response.id);
        clearTimeout(request.timeout);

        if (response.error) {
          request.reject(new Error(response.error));
        } else {
          request.resolve(response.result);
        }
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  // Clean up any pending requests
  cleanup(): void {
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }
}