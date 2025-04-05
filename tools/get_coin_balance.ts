import { getProfileBalances } from "@zoralabs/coins-sdk";
import type { Address } from "viem";
export async function fetchUserBalances(identifier: Address | string,count:number=20,after?:string) {
  const response = await getProfileBalances({
    identifier, // Can also be zora user profile handle
    count,        // Optional: number of balances per page
    after, // Optional: for pagination
    chainIds: [84532] // base-sepolia chain ID
  });
 
  const profile: any = response.data?.profile;
  
  // Transform the response into a structured JSON format
  const result = {
    totalBalances: profile.coinBalances?.length || 0,
    balances: profile.coinBalances || [],
    pagination: {
    
      endCursor: profile.coinBalances?.pageInfo?.endCursor || null
    }
  };
  
  return result;
}