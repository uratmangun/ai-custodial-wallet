import { getCoinsLastTraded } from "@zoralabs/coins-sdk";
 
export async function fetchLastTradedCoins(count: number=20, after?: string) {
  const response = await getCoinsLastTraded({
    count,        // Optional: number of coins per page
    after, // Optional: for pagination
  });
  
  // Transform the response into a structured JSON format
  const coins = response.data?.exploreList?.edges?.map((coin: any, index: number) => {
    return {
      rank: index + 1,
      name: coin.node.name,
      symbol: coin.node.symbol,
      marketCap: coin.node.marketCap,
      volume24h: coin.node.volume24h,
      address: coin.node.address,
      creatorAddress: coin.node.creatorAddress,
      previewImage: coin.node.media?.previewImage || null
    };
  }) || [];
  
  // Create the JSON response object
  const result = {
    status: "success",
    tokens: coins,
    pagination: response.data?.exploreList?.pageInfo?.hasNextPage
      ? { nextCursor: response.data?.exploreList?.pageInfo?.endCursor }
      : null
  };
  
  return result;
}