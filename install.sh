#!/bin/bash

# MCP RPC Bridge - Easy Installation Script
# Usage: curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/mcp-rpc-bridge/main/install.sh | bash

set -e

echo "🔧 Installing MCP RPC Bridge..."

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is required but not installed."
    echo "📥 Install Bun first: https://bun.sh/"
    exit 1
fi

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is required but not installed."
    exit 1
fi

# Create temp directory
TEMP_DIR=$(mktemp -d)
echo "📂 Using temp directory: $TEMP_DIR"

# Clone repository
echo "📥 Cloning repository..."
git clone https://github.com/YOUR_USERNAME/mcp-rpc-bridge.git "$TEMP_DIR"

# Navigate to project directory
cd "$TEMP_DIR"

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Build the project
echo "🏗️  Building project..."
bun run build

# Install globally
echo "🌍 Installing globally..."
bun link

# Cleanup
echo "🧹 Cleaning up..."
rm -rf "$TEMP_DIR"

echo "✅ MCP RPC Bridge installed successfully!"
echo "🚀 You can now use 'mcp-rpc-bridge' command anywhere."
echo ""
echo "Next steps:"
echo "1. Start your RPC runtime server"
echo "2. Configure Claude Desktop with this MCP server"
echo "3. Run: mcp-rpc-bridge"
echo ""
echo "For configuration help, see: https://github.com/YOUR_USERNAME/mcp-rpc-bridge#readme"