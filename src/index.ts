#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

import { McpConfig } from "./config.js";
import { RpcMcpServer } from "./rpc-mcp-server.js";

// Configuration - can be overridden by environment variables
const config: McpConfig = {
  rpcServer: {
    wsUrl: process.env.RPC_WS_URL || "ws://localhost:8080/ws",
    httpUrl: process.env.RPC_HTTP_URL || "http://localhost:8080",
  },
  defaultTimeout: parseInt(process.env.RPC_TIMEOUT || "30000"),
};

// Tool definitions
const tools: Tool[] = [
  {
    name: "execute_typescript",
    description:
      "Execute TypeScript code on the RPC server with injected rpc client",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "TypeScript code to execute on Deno",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "get_rpc_client_code",
    description:
      "Get the complete TypeScript client definitions for all available RPC functions",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_rpc_info",
    description: "Get help about the RPC system and available functions",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "check_connection",
    description:
      "Check the status of RPC server connections (WebSocket and HTTP)",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

class McpRpcBridge {
  private server: Server;
  private rpcServer: RpcMcpServer;

  constructor() {
    this.server = new Server(
      {
        name: "rpc-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.rpcServer = new RpcMcpServer(config);
    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "execute_typescript": {
            const result = await this.rpcServer.handleRunScript(
              args as { code: string; timeout?: number }
            );
            return {
              content: [
                {
                  type: "text",
                  text: result,
                },
              ],
            };
          }

          case "get_rpc_client_code": {
            const result = await this.rpcServer.handleGetTools();
            return {
              content: [
                {
                  type: "text",
                  text: result,
                },
              ],
            };
          }

          case "get_rpc_info": {
            const result = await this.rpcServer.handleHelp();
            return {
              content: [
                {
                  type: "text",
                  text: result,
                },
              ],
            };
          }

          case "check_connection": {
            const result = await this.rpcServer.handleStatus();
            return {
              content: [
                {
                  type: "text",
                  text: result,
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start(): Promise<void> {
    // Initialize RPC server connection
    await this.rpcServer.initialize();

    // Start MCP server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error("RPC MCP Server started successfully");
    console.error(`WebSocket: ${config.rpcServer.wsUrl}`);
    console.error(`HTTP: ${config.rpcServer.httpUrl}`);
  }

  async stop(): Promise<void> {
    await this.rpcServer.close();
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.error("Shutting down MCP server...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.error("Shutting down MCP server...");
  process.exit(0);
});

// Start the server
const bridge = new McpRpcBridge();
bridge.start().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
