import { z } from "zod";
import { fetchUserBalances } from "../tools/get_coin_balance";
import type { Address } from "viem";

const getUserCoinBalanceAction = {
  name: "GET_USER_COIN_BALANCE_ACTION",
  similes: [
    "get user balance",
    "fetch user coin balances",
    "show me my crypto balances",
    "lookup balances by user address",
  ],
  description: `Fetches the coin balances for a specific user identifier (address or Zora handle). Supports pagination.`,
  examples: [
    [
      {
        input: { identifier: "0xValidUserAddress..." },
        output: {
          status: "success",
          totalBalances: 2,
          balances: [
            { coinAddress: "0xCoin1...", balance: "1000000000000000000", coinName: "Coin One", coinSymbol: "CO1" },
            { coinAddress: "0xCoin2...", balance: "500000000000000000", coinName: "Coin Two", coinSymbol: "CT2" },
          ],
          pagination: { endCursor: "someCursorString" }
        },
        explanation: "Successfully fetched coin balances for the given user identifier.",
      },
    ],
    [
      {
        input: { identifier: "nonExistentUserOrInvalid..." },
        output: {
          status: "error",
          message: "Failed to fetch user balances or user not found."
        },
        explanation: "Failed to fetch coin balances as the identifier was invalid or not found.",
      },
    ],
    [
      {
        input: { identifier: "zoraUserHandle" , count: 10, after: "previousCursorString"},
        output: {
          status: "success",
        },
        explanation: "Successfully fetched next page of coin balances using pagination.",
      },
    ],
  ],
  schema: z.object({
    identifier: z.string().describe("The user identifier (address or Zora handle) to fetch balances for."),
    count: z.number().optional().describe("Number of balances per page (optional). Default is 20."),
    after: z.string().optional().describe("Pagination cursor (optional).")
  }),
  handler: async (input: Record<string, any>) => {
    try {
      const { identifier, count, after } = input;
      if (!identifier) {
         throw new Error("Identifier (address or handle) is required to fetch user balances.");
      }
      const userIdentifier = identifier.startsWith('0x') ? identifier as Address : identifier;

      const result = await fetchUserBalances(userIdentifier, count, after);

      if (result && typeof result === 'object' && 'error' in result) {
           return {
            status: "error",
            message: (result as { error: string }).error || "Failed to fetch user balances from tool."
           }
      }

      return {
        status: "success",
        ...result
      };
    } catch (error) {
      console.error("Error in GET_USER_COIN_BALANCE_ACTION:", error);
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to fetch user coin balances"
      };
    }
  },
};

export default getUserCoinBalanceAction;