#!/usr/bin/env node

import { spawn } from 'child_process';

// Test the MCP server by sending JSON-RPC messages
async function testMcpServer() {
  console.log('🧪 Testing MCP Server...\n');

  const server = spawn('bun', ['run', 'dist/index.js'], {
    env: {
      ...process.env,
      RPC_WS_URL: 'ws://localhost:9002/ws',
      RPC_HTTP_URL: 'http://localhost:9002'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let responseData = '';

  server.stdout.on('data', (data) => {
    responseData += data.toString();
  });

  server.stderr.on('data', (data) => {
    console.log('Server log:', data.toString().trim());
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('📋 Testing list_tools...');

  // Test 1: List tools
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  };

  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('📥 Response:', responseData);

  console.log('\n🔧 Testing get_available_rpc_tools...');

  // Test 2: Call get_available_rpc_tools
  const callToolRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'get_available_rpc_tools',
      arguments: {}
    }
  };

  responseData = ''; // Clear previous response
  server.stdin.write(JSON.stringify(callToolRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('📥 Response:', responseData);

  console.log('\n⚡ Testing status...');

  // Test 3: Call status
  const statusRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'status',
      arguments: {}
    }
  };

  responseData = ''; // Clear previous response
  server.stdin.write(JSON.stringify(statusRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('📥 Response:', responseData);

  console.log('\n🚀 Testing run_script...');

  // Test 4: Call run_script
  const scriptRequest = {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'run_script',
      arguments: {
        code: `
console.log("🎯 Testing namespaced RPC calls:");
const sum = await rpc.math.add({a: 10, b: 5});
console.log("Math result:", sum);

const pokemon = await rpc.pokemon.fetchPokemon({name: "pikachu"});
console.log("Pokemon:", pokemon.name, "ID:", pokemon.id);
        `.trim()
      }
    }
  };

  responseData = ''; // Clear previous response
  server.stdin.write(JSON.stringify(scriptRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('📥 Response:', responseData);

  // Clean up
  server.kill();
}

testMcpServer().catch(console.error);