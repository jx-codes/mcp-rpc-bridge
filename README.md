# MCP-RPC Bridge: Integration with RPC Runtime

An MCP (Model Context Protocol) server that bridges Claude and other MCP clients to the `mcp-rpc-runtime` WebSocket RPC system, enabling "Code Mode" execution where LLMs write TypeScript instead of using traditional tool calls.

## How It Works

This MCP server acts as a translator between the MCP protocol and the RPC runtime's WebSocket interface:

```
Claude ◄──── MCP Protocol ────► MCP Bridge ◄──── WebSocket RPC ────► RPC Runtime
       (stdio transport)                    (JSON-RPC over WS)
```

## Installation

### Prerequisites

- [Bun](https://bun.sh/) runtime (v1.0.0 or higher)
- Running RPC runtime server at `ws://localhost:8080/ws`

### Method 1: One-Line Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/mcp-rpc-bridge/main/install.sh | bash
```

This will:

- Clone the repository
- Install dependencies
- Build the project
- Install globally as `mcp-rpc-bridge` command
- Clean up temporary files

### Method 2: Manual Global Install

```bash
# Clone and install globally
git clone https://github.com/YOUR_USERNAME/mcp-rpc-bridge.git
cd mcp-rpc-bridge
bun install
bun run install-global

# Now you can use 'mcp-rpc-bridge' anywhere!
mcp-rpc-bridge
```

To uninstall:

```bash
bun run uninstall-global
```

### Method 3: Direct Build and Run

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/mcp-rpc-bridge.git
cd mcp-rpc-bridge

# Install dependencies and build
bun install
bun run build

# Run directly
bun run start
```

### Method 4: Development Mode

```bash
# Clone for development
git clone https://github.com/YOUR_USERNAME/mcp-rpc-bridge.git
cd mcp-rpc-bridge
bun install

# Run with auto-reload
bun run dev
```

## Quick Start

1. **Start your RPC runtime server** (must be running on `ws://localhost:8080/ws`)

2. **Configure Claude Desktop** by adding to your MCP settings:

```json
{
  "mcpServers": {
    "rpc-bridge": {
      "command": "mcp-rpc-bridge",
      "env": {
        "RPC_WS_URL": "ws://localhost:8080/ws",
        "RPC_HTTP_URL": "http://localhost:8080"
      }
    }
  }
}
```

3. **Test the connection** - Claude should now have access to these tools:
   - `run_script` - Execute TypeScript code with RPC access
   - `get_available_rpc_tools` - Get all available RPC functions
   - `help` - Get help and examples
   - `status` - Check connection health

### Integration Points

**WebSocket Connection** (`src/websocket-manager.ts:12-26`)

- Maintains persistent connection to RPC runtime at `ws://localhost:8080/ws`
- Auto-reconnects on connection loss with exponential backoff
- Connection pooling to handle multiple concurrent requests

**Message Correlation** (`src/message-correlator.ts:33-64`)

- Maps async RPC calls to MCP responses using unique IDs
- Handles request/response matching across WebSocket boundary
- Timeout management (default 30s) with proper cleanup

**Tool Translation** (`src/rpc-mcp-server.ts:20-30`)

- Converts MCP `run_script` calls to RPC runtime script execution
- Translates `get_available_rpc_tools` to HTTP client.ts fetching
- Provides status checks for both WebSocket and HTTP endpoints

## MCP Tools Provided

### `run_script`

Executes TypeScript code on the RPC runtime with injected `rpc` client:

```typescript
// Input (from Claude)
{
  "code": "const result = await rpc.math.add({a: 5, b: 3}); console.log(result);",
  "timeout": 30000
}

// What happens internally:
// 1. Generate unique ID: "mcp_1234567890_abc123"
// 2. Send to runtime: {"script": "...", "id": "mcp_1234567890_abc123"}
// 3. Runtime executes with injected rpc client
// 4. Return response: {"result": "8\n", "id": "mcp_1234567890_abc123"}
```

### `get_available_rpc_tools`

Fetches the complete TypeScript client definitions from runtime:

```typescript
// Calls: GET http://localhost:8080/client.ts
// Returns: Complete TypeScript client with all type definitions
export interface RpcClient {
  math: {
    add(args: Math_AddArgs): Promise<number>;
    multiply(args: Math_MultiplyArgs): Promise<number>;
  };
  pokemon: {
    fetchPokemon(args: Pokemon_FetchArgs): Promise<Pokemon>;
  };
}
```

### `help`

Provides runtime status and usage examples by combining:

- Health check: `GET /health` → available functions list
- Client interface extraction from generated TypeScript
- Usage examples and documentation

### `status`

Health checks both communication channels:

- HTTP endpoint: `GET /health`
- WebSocket connection: Test connectivity and response time

## Configuration

**Environment Variables:**

```bash
RPC_WS_URL=ws://localhost:8080/ws     # WebSocket endpoint
RPC_HTTP_URL=http://localhost:8080    # HTTP endpoint
RPC_TIMEOUT=30000                     # Request timeout (ms)
```

**Default Configuration** (`src/index.ts:15-21`):

```typescript
const config: McpConfig = {
  rpcServer: {
    wsUrl: process.env.RPC_WS_URL || "ws://localhost:8080/ws",
    httpUrl: process.env.RPC_HTTP_URL || "http://localhost:8080",
  },
  defaultTimeout: parseInt(process.env.RPC_TIMEOUT || "30000"),
};
```

## Usage with Claude Desktop

**MCP Configuration:**

```json
{
  "mcpServers": {
    "rpc-bridge": {
      "command": "bun",
      "args": ["run", "/path/to/mcp-rpc-bridge/dist/index.js"],
      "env": {
        "RPC_WS_URL": "ws://localhost:8080/ws"
      }
    }
  }
}
```

**Claude Workflow:**

1. Claude calls `get_available_rpc_tools` to see what functions are available
2. Claude writes TypeScript code using the `rpc` object
3. Claude calls `run_script` with the TypeScript code
4. Code executes on runtime with full access to all RPC functions
5. Results return to Claude as text output

## Error Handling

**Connection Failures** (`src/websocket-manager.ts:46-57`):

```typescript
// Auto-reconnection on unexpected WebSocket close
this.ws.onclose = () => {
  console.log("WebSocket connection closed, attempting reconnect...");
  setTimeout(() => {
    if (!this.isConnecting) {
      this.connect().catch((err) => console.error("Reconnection failed:", err));
    }
  }, 1000);
};
```

**Request Timeouts** (`src/message-correlator.ts:42-45`):

```typescript
const timeoutHandle = setTimeout(() => {
  this.pendingRequests.delete(id);
  reject(new Error(`Request timeout: ${id}`));
}, timeout);
```

**RPC Errors** (`src/message-correlator.ts:75-79`):

```typescript
if (response.error) {
  request.reject(new Error(response.error));
} else {
  request.resolve(response.result);
}
```

## Runtime Integration Flow

### Startup Sequence

1. **MCP Bridge starts** → Connects to stdio transport for MCP communication
2. **WebSocket connection** → Connects to RPC runtime at configured URL
3. **Health check** → Verifies runtime is responding and gets function list
4. **Ready** → MCP server advertises tools to Claude

### Script Execution Flow

1. **Claude calls `run_script`** → MCP request with TypeScript code
2. **Generate correlation ID** → Unique ID for request/response matching
3. **Send to runtime** → WebSocket message `{script: "...", id: "..."}`
4. **Runtime executes** → Injects `rpc` client and runs TypeScript
5. **Response correlation** → Match response ID to pending request
6. **Return to Claude** → MCP tool response with execution output

### Type Discovery Flow

1. **Claude calls `get_available_rpc_tools`** → Requests available functions
2. **HTTP fetch** → GET `/client.ts` from runtime
3. **Return definitions** → Complete TypeScript client code with types

## Development

**Build and Run:**

```bash
bun install
bun run build     # TypeScript compilation
bun run start     # Start MCP server
bun run dev       # Watch mode development
```

**Testing Integration:**

```bash
# Test WebSocket connection
echo '{"script":"console.log(\"test\")", "id":"test123"}' | websocat ws://localhost:8080/ws

# Test HTTP endpoints
curl http://localhost:8080/health
curl http://localhost:8080/client.ts

# Test MCP server (requires MCP client)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | bun run start
```

## Architecture Benefits

**Clean Separation**: MCP protocol concerns separate from RPC execution
**Protocol Translation**: Handles impedance mismatch between MCP and WebSocket RPC
**Connection Management**: Robust WebSocket handling with reconnection
**Async Correlation**: Proper request/response matching for concurrent operations
**Error Propagation**: Meaningful error messages across protocol boundary

## Troubleshooting

**"WebSocket connection failed"**: Runtime not running or wrong URL
**"Request timeout"**: Increase `RPC_TIMEOUT` or check runtime performance
**"Functions not appearing"**: Runtime `/health` endpoint not responding
**"Script execution errors"**: Check runtime logs for TypeScript compilation issues

The MCP bridge handles the complexity of protocol translation so Claude can seamlessly execute TypeScript code against your RPC functions.
