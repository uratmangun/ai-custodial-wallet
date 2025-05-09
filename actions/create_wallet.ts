import { z } from "zod";
import { create_wallet } from "../tools";

const createWalletAction = {
  name: "CREATE_WALLET_ACTION",
  similes: [
    "create wallet",
    "create new wallet",
    
  ],
  description: `Create a new EVM wallet.`,
  examples: [
    [
      {
        input: {},
        output: {
          status: "success",
          id: "1234567890123456789012345678901234567890",
          publicKey: "0x1234567890123456789012345678901234567890",
          createdAt: "2021-01-01T00:00:00.000Z",
          updatedAt: "2021-01-01T00:00:00.000Z"
        },
        explanation: "Create a new EVM wallet",
      },
    ],
   
  ],
  schema: z.object({
  }),
  handler: async (input: Record<string, any>) => {
    try {
      const wallet = await create_wallet();

      return {
        status: "success",
        ...wallet
      };
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to create wallet"
      };
    }
  },
};

export default createWalletAction;