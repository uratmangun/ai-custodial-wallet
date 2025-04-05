import { z } from "zod";
import { fetchLastTradedCoins } from "../tools/get_last_traded_coin";

const getLastTradedCoinsAction = {
  name: "GET_LAST_TRADED_COINS_ACTION",
  similes: [
    "get last traded coins",
    "fetch recently traded coins",
    "list newest coins traded",
    "show me recent crypto activity",
  ],
  description: `Fetches the most recently traded coins. Allows specifying the number of coins and pagination.`,
  examples: [
    [
      {
        input: { count: 2 },
        output: {
          status: "success",
          tokens: [
            {
              rank: 1,
              name: "Coin X",
              symbol: "CNX",
              marketCap: "1200000",
              volume24h: "60000",
              address: "0xAddressX...",
              creatorAddress: "0xCreatorX...",
              previewImage: "https://example.com/imageX.png"
            },
            {
              rank: 2,
              name: "Coin Y",
              symbol: "CNY",
              marketCap: "950000",
              volume24h: "45000",
              address: "0xAddressY...",
              creatorAddress: "0xCreatorY...",
              previewImage: null
            }
          ],
          pagination: { nextCursor: "someCursorStringForLastTraded" }
        },
        explanation: "Fetch the 2 most recently traded coins.",
      },
    ],
    [
      {
        input: { count: 1, after: "someCursorStringForLastTraded" },
        output: {
          status: "success",
          tokens: [
            {
              rank: 3,
              name: "Coin Z",
              symbol: "CNZ",
              marketCap: "700000",
              volume24h: "35000",
              address: "0xAddressZ...",
              creatorAddress: "0xCreatorZ...",
              previewImage: "https://example.com/imageZ.png"
            }
          ],
          pagination: null
        },
        explanation: "Fetch the next recently traded coin using pagination.",
      },
    ],
    [
      {
        input: { },
        output: {
          status: "success",
          tokens: [
            {
              rank: 1,
              name: "Coin A",
              symbol: "CNA",
              marketCap: "1000000",
              volume24h: "50000",
              address: "0x...",
              creatorAddress: "0x...",
              previewImage: "https://example.com/imageA.png"
            },
            {
              rank: 2,
              name: "Coin B",
              symbol: "CNB",
              marketCap: "800000",
              volume24h: "40000",
              address: "0x...",
              creatorAddress: "0x...",
              previewImage: "https://example.com/imageB.png"
            },
            {
              rank: 3,
              name: "Coin C",
              symbol: "CNC",
              marketCap: "600000",
              volume24h: "30000",
              address: "0x...",
              creatorAddress: "0x...",
              previewImage: "https://example.com/imageC.png"
            }
          ],
          pagination: { nextCursor: "someDefaultCursor" }
        },
        explanation: "Fetch recently traded coins using default count.",
      },
    ],
  ],
  schema: z.object({
    count: z.number().optional().default(20).describe("Number of coins to fetch per page (Default: 20)."),
    after: z.string().optional().describe("Cursor for pagination to fetch the next page."),
  }),
  handler: async (input: Record<string, any>) => {
    try {
      const count = input.count ?? 20;
      const after = input.after;

      const result = await fetchLastTradedCoins(count, after);

      return result;
    } catch (error) {
      console.error("Error in GET_LAST_TRADED_COINS_ACTION:", error);
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to fetch last traded coins"
      };
    }
  },
};

export default getLastTradedCoinsAction;