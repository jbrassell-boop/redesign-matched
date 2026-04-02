#!/usr/bin/env bash
# Run in a dedicated terminal. Keeps Azure MCP server alive on port 5008.
# Claude Code connects to it at http://localhost:5008
echo "Starting Azure MCP server on port 5008..."
npx -y @azure/mcp@latest server start --transport http --port 5008
