import { parseArgs } from "node:util";

export interface McpConfig {
  rpcServer: {
    wsUrl: string;    // "ws://localhost:8080/ws"
    httpUrl: string;  // "http://localhost:8080"
  };
  defaultTimeout: number; // 30000ms
}

export const get_config = (): McpConfig => {
  const args = parseArgs({
    args: process.argv.slice(2),
    options: {
      "rpc-port": {
        type: "string",
        short: "p",
      },
      "hostname": {
        type: "string",
        short: "h",
      },
      "timeout": {
        type: "string",
        short: "t",
      },
    },
    strict: false,
  });

  // Use provided values or defaults
  const hostname = args.values["hostname"] as string | undefined || "localhost";
  const portStr = args.values["rpc-port"] as string | undefined || "8080";
  const timeoutStr = args.values["timeout"] as string | undefined || "30000";

  const port = parseInt(portStr, 10);
  if (isNaN(port)) {
    console.error("Error: --rpc-port must be a valid number");
    process.exit(1);
  }

  const timeout = parseInt(timeoutStr, 10);
  if (isNaN(timeout)) {
    console.error("Error: --timeout must be a valid number");
    process.exit(1);
  }

  // Construct URLs from hostname and port
  const wsUrl = `ws://${hostname}:${port}/ws`;
  const httpUrl = `http://${hostname}:${port}`;

  return {
    rpcServer: {
      wsUrl,
      httpUrl,
    },
    defaultTimeout: timeout,
  };
};