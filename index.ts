import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createWallet, createWalletParams } from "./tools/create_wallet.js";

// Create server instance
const server = new McpServer({
  name: "ai-custodial-wallet",
  version: "1.0.0",
  capabilities: {
    
  },
});


server.tool(
  "CREATE_WALLET",
  "Create a new wallet for a user",
  createWalletParams,
  createWallet
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});