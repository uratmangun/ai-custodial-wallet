import { z } from "zod";
import { fetchSingleCoin } from "../tools/get_coin";

const getCoinAction = {
  name: "GET_COIN_ACTION",
  similes: [
    "get coin",
    "fetch coin",
    "show me coin details",
    "lookup crypto by address",
  ],
  description: `Fetches details for a specific coin using its contract address.`,
  examples: [
    [
      {
        input: { address: "0xValidCoinAddress..." },
        output: {
          status: "success",
          name: "Example Coin",
          symbol: "EXC",
          description: "An example coin description.",
          totalSupply: "1000000000000000000000", // Example value
          marketCap: "5000000",
          volume24h: "200000",
          creatorAddress: "0xCreatorAddress...",
          createdAt: "2023-01-01T12:00:00Z",
          uniqueHolders: 1234,
          previewImage: "https://example.com/image.png"
        },
        explanation: "Successfully fetched coin details for the given address.",
      },
    ],
    [
      {
        input: { address: "0xInvalidOrNotFoundAddress..." },
        output: {
          status: "error",
          message: "Coin not found"
        },
        explanation: "Failed to fetch coin details as the address was not found or invalid.",
      },
    ],

  ],
  schema: z.object({
    address: z.string().describe("The contract address of the coin to fetch."),
  }),
  handler: async (input: { address: string }) => {
    try {
      const { address } = input;
      if (!address) {
         throw new Error("Address is required to fetch coin details.");
      }
      const result = await fetchSingleCoin(address);

      // Check if the tool returned an error message (like 'Coin not found')
      if (result && typeof result === 'object' && 'message' in result) {
           return {
            status: "error",
            message: (result as { message: string }).message
           }
      }

      return {
        status: "success",
        ...result
      };
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to fetch coin details"
      };
    }
  },
};

export default getCoinAction;