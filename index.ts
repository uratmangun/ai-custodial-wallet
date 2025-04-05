import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./mcp/create_mcp.js";
import createWalletAction from "./actions/create_wallet";
import listWalletAction from "./actions/list_wallet";
import generateSecretAction from "./actions/generate_secret";
import checkGasAction from "./actions/check_gas";
import transferFundsAction from "./actions/transfer";
import getCoinTopGainersAction from "./actions/get_last_traded_coin.js";
import getCoinAction from "./actions/get_coin";
import getCoinBalanceAction from "./actions/get_coin_balance";
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
  GENERATE_SECRET_ACTION: generateSecretAction,
  CHECK_GAS_ACTION: checkGasAction,
  TRANSFER_FUNDS_ACTION: transferFundsAction,
  GET_COIN_TOP_GAINERS_ACTION: getCoinTopGainersAction,
  GET_COIN_ACTION: getCoinAction,
  GET_COIN_BALANCE_ACTION: getCoinBalanceAction,
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