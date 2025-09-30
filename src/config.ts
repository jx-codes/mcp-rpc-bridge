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
      "ws-url": {
        type: "string",
        short: "w",
      },
      "http-url": {
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
  const wsUrl = args.values["ws-url"] as string | undefined || "ws://localhost:8080/ws";
  const httpUrl = args.values["http-url"] as string | undefined || "http://localhost:8080";
  const timeoutStr = args.values["timeout"] as string | undefined || "30000";

  const timeout = parseInt(timeoutStr, 10);
  if (isNaN(timeout)) {
    console.error("Error: --timeout must be a valid number");
    process.exit(1);
  }

  return {
    rpcServer: {
      wsUrl,
      httpUrl,
    },
    defaultTimeout: timeout,
  };
};