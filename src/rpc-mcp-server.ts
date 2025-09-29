import { WebSocketManager } from './websocket-manager.js';
import { MessageCorrelator, ScriptMessage } from './message-correlator.js';
import { McpConfig } from './config.js';

export class RpcMcpServer {
  private config: McpConfig;
  private correlator = new MessageCorrelator();
  private wsManager: WebSocketManager;

  constructor(config: McpConfig) {
    this.config = config;
    this.wsManager = new WebSocketManager(config.rpcServer.wsUrl);
  }

  async initialize(): Promise<void> {
    await this.wsManager.ensureConnected();
  }

  // MCP tool handlers
  async handleRunScript(args: { code: string; timeout?: number }): Promise<string> {
    await this.wsManager.ensureConnected();

    const result = await this.correlator.sendAndWait<string>(
      this.wsManager.getWebSocket(),
      { script: args.code } as ScriptMessage,
      args.timeout || this.config.defaultTimeout
    );

    return result;
  }

  async handleGetTools(): Promise<string> {
    const response = await fetch(`${this.config.rpcServer.httpUrl}/client.ts`);

    if (!response.ok) {
      throw new Error(`Failed to fetch client: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  }

  async handleHelp(): Promise<string> {
    try {
      const healthResponse = await fetch(`${this.config.rpcServer.httpUrl}/health`);
      const health = await healthResponse.json() as { status: string; functions: string[] };

      const clientResponse = await fetch(`${this.config.rpcServer.httpUrl}/client.ts`);
      const clientCode = await clientResponse.text();

      // Extract interface from client code for help
      const interfaceMatch = clientCode.match(/export interface RpcClient \{[\s\S]*?\n\}/);
      const rpcInterface = interfaceMatch ? interfaceMatch[0] : 'Interface not found';

      return `RPC Server Status: ${health.status}
Available Functions: ${health.functions.join(', ')}

Usage:
1. Use run_script tool to execute TypeScript code
2. Use get_available_rpc_tools to see full client definitions

RPC Client Interface:
${rpcInterface}

Example Script:
const result = await rpc.math.add({a: 5, b: 3});
console.log('Result:', result);
`;
    } catch (error) {
      return `Help unavailable: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async handleStatus(): Promise<string> {
    const checks = [];

    // Check HTTP endpoint
    try {
      const response = await fetch(`${this.config.rpcServer.httpUrl}/health`);
      const health = await response.json() as { status: string; functions: string[] };
      checks.push(`HTTP: ✅ OK (${health.functions.length} functions)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push(`HTTP: ❌ Failed - ${message}`);
    }

    // Check WebSocket
    try {
      await this.wsManager.ensureConnected();
      checks.push(`WebSocket: ✅ Connected`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push(`WebSocket: ❌ Failed - ${message}`);
    }

    return checks.join('\n');
  }

  async close(): Promise<void> {
    this.correlator.cleanup();
    this.wsManager.close();
  }
}