#!/usr/bin/env node

// Simple test using stdio pipes
import { spawn } from 'child_process';

async function testTool(toolName, args = {}) {
  console.log(`\n🔧 Testing ${toolName}...`);

  const server = spawn('bun', ['run', 'dist/index.js'], {
    env: {
      ...process.env,
      RPC_WS_URL: 'ws://localhost:9002/ws',
      RPC_HTTP_URL: 'http://localhost:9002'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  return new Promise((resolve) => {
    let stdout = '';

    server.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    server.stderr.on('data', (data) => {
      console.log('Server:', data.toString().trim());
    });

    // Wait for server to start
    setTimeout(() => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      };

      server.stdin.write(JSON.stringify(request) + '\n');

      // Wait for response then kill
      setTimeout(() => {
        server.kill();

        // Extract just the result
        try {
          const lines = stdout.split('\n').filter(line => line.trim());
          for (const line of lines) {
            if (line.includes('"result"')) {
              const response = JSON.parse(line);
              if (response.result && response.result.content) {
                console.log('✅ Result:', response.result.content[0].text.substring(0, 200) + '...');
              }
              break;
            }
          }
        } catch (e) {
          console.log('❌ Parse error:', e.message);
          console.log('Raw output:', stdout.substring(0, 300));
        }

        resolve();
      }, 3000);
    }, 2000);
  });
}

async function runTests() {
  console.log('🧪 Testing MCP Server Tools\n');

  await testTool('status');
  await testTool('help');
  await testTool('get_available_rpc_tools');
  await testTool('run_script', {
    code: 'console.log("Hello from RPC!"); const result = await rpc.math.add({a: 1, b: 2}); console.log("1 + 2 =", result);'
  });

  console.log('\n✅ All tests completed!');
}

runTests().catch(console.error);