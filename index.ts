import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./mcp/create_mcp.js";
import createWalletAction from "./actions/create_wallet";
import listWalletAction from "./actions/list_wallet";
import generateSecretAction from "./actions/generate_secret";

// Create server instance
const server = new McpServer({
  name: "ai-custodial-wallet",
  version: "1.0.0",
  capabilities: {
    
  },
});

const actions = {
  CREATE_WALLET_ACTION: createWalletAction,
  LIST_WALLET_ACTION: listWalletAction,
  GENERATE_SECRET_ACTION: generateSecretAction
};

createMcpServer(server, actions);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});