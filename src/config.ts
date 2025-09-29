export interface McpConfig {
  rpcServer: {
    wsUrl: string;    // "ws://localhost:8080/ws"
    httpUrl: string;  // "http://localhost:8080"
  };
  defaultTimeout: number; // 30000ms
}