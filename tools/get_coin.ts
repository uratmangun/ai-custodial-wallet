import { getCoin } from "@zoralabs/coins-sdk";
 
export async function fetchSingleCoin(address: string) {
  const response = await getCoin({
    address,
    chain: 84532, // Optional: Base Sepolia chain
  });
  
  const coin = response.data?.zora20Token;
  
  if (!coin) {
    return {
      message: "Coin not found"
    };
  }
  
  const result = {
    name: coin.name,
    symbol: coin.symbol,
    description: coin.description,
    totalSupply: coin.totalSupply,
    marketCap: coin.marketCap,
    volume24h: coin.volume24h,
    creatorAddress: coin.creatorAddress,
    createdAt: coin.createdAt,
    uniqueHolders: coin.uniqueHolders,
    previewImage: coin.media?.previewImage || null
  };
  
  return result;
}