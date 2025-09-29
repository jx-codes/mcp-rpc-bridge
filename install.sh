#!/bin/bash

# MCP RPC Bridge - Easy Installation Script
# Usage: curl -fsSL https://raw.githubusercontent.com/jx-codes/mcp-rpc-bridge/main/install.sh | bash

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
git clone https://github.com/jx-codes/mcp-rpc-bridge.git "$TEMP_DIR"

# Navigate to project directory
cd "$TEMP_DIR"

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Compile the project
echo "🏗️  Compiling project..."
bun build --compile --outfile=mcp-rpc-bridge src/index.ts

# Install globally to ~/.bun/bin (no sudo needed)
echo "🌍 Installing globally..."
mkdir -p "$HOME/.bun/bin"
if [ -f "mcp-rpc-bridge" ]; then
    echo "📋 Removing any existing binary..."
    rm -f "$HOME/.bun/bin/mcp-rpc-bridge"
    echo "📋 Copying new binary..."
    cp mcp-rpc-bridge "$HOME/.bun/bin/mcp-rpc-bridge"
    chmod +x "$HOME/.bun/bin/mcp-rpc-bridge"
    echo "✅ Binary installed successfully"
else
    echo "❌ Compiled binary not found!"
    exit 1
fi

# Add to PATH if needed
if [[ ":$PATH:" != *":$HOME/.bun/bin:"* ]]; then
    echo "📋 Adding ~/.bun/bin to PATH..."
    echo 'export PATH="$HOME/.bun/bin:$PATH"' >> "$HOME/.bashrc"
    echo 'export PATH="$HOME/.bun/bin:$PATH"' >> "$HOME/.zshrc" 2>/dev/null || true
fi

# Cleanup
echo "🧹 Cleaning up..."
rm -rf "$TEMP_DIR"

echo "✅ MCP RPC Bridge installed successfully!"
echo "🚀 You can now use 'mcp-rpc-bridge' command anywhere."
echo ""
echo "📍 Installed to: \$HOME/.bun/bin/mcp-rpc-bridge"
echo "   (This should be in your PATH automatically)"
echo ""
echo "Next steps:"
echo "1. Start your RPC runtime server"
echo "2. Configure Claude Desktop with this MCP server"
echo "3. Run: mcp-rpc-bridge"
echo ""
echo "For configuration help, see: https://github.com/jx-codes/mcp-rpc-bridge#readme"