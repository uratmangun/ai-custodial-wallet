import { z } from "zod";


const balanceAction = {
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
          wallet: "0x1234567890123456789012345678901234567890",
        },
        explanation: "Create a new EVM wallet",
      },
    ],
   
  ],
  schema: z.object({
    tokenAddress: z.string().optional(),
  }),
  handler: async (input: Record<string, any>) => {
    const balance = await get_balance(
      agent,
      input.tokenAddress && new PublicKey(input.tokenAddress),
    );

    return {
      status: "success",
      balance: balance,
      token: input.tokenAddress || "SOL",
    };
  },
};

export default balanceAction;