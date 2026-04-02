#!/usr/bin/env bash
# Azure MCP runs via stdio — Claude Code spawns it automatically on session start.
# No separate terminal needed. Configured in ~/.claude.json as user-scoped MCP server.
#
# To verify: claude mcp list
# To test: ask Claude "List my Azure SQL databases"
echo "Azure MCP is stdio-based — Claude Code manages it automatically."
echo "Run: claude mcp list   to verify."
