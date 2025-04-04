import { z } from "zod";
import { list_wallet } from "../tools";

const listWalletAction = {
  name: "LIST_WALLET_ACTION",
  similes: [
    "list wallet",
    "list wallets",
    
  ],
  description: `List all wallets.`,
  examples: [
    [
      {
        input: {},
        output: {
          status: "success",
        wallets:[{id:"1234567890123456789012345678901234567890",publicKey:"0x1234567890123456789012345678901234567890"}]
        },
        explanation: "List all wallets",
      },
    ],
    [
      {
        input: {},
        output: {
          status: "success",
        wallets:[]
        },
        explanation: "No wallets found",
      },
    ],
   
  ],
  schema: z.object({
  }),
  handler: async (input: Record<string, any>) => {
    try {
      const wallets = await list_wallet();

      return {
        status: "success",
        ...wallets
      };
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to list wallets"
      };
    }
  },
};

export default listWalletAction;