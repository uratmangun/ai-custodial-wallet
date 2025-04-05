import { createPublicClient, http, formatUnits, parseEther, type Address, type Account } from 'viem';
import { baseSepolia } from 'viem/chains';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a public client for Base Sepolia
// It will use default public RPC endpoints if available in viem/chains
const client = createPublicClient({
  chain: baseSepolia,
  transport: http(), // Uses default public RPC provider
});

interface GasEstimate {
    maxFeePerGas: string; // wei
    maxFeePerGasGwei: string; // gwei
    maxPriorityFeePerGas: string; // wei
    maxPriorityFeePerGasGwei: string; // gwei
}

/**
 * Fetches current gas fee estimates for the Base Sepolia network.
 * Returns maxFeePerGas and maxPriorityFeePerGas in both wei and gwei.
 */
export async function check_gas(): Promise<GasEstimate> {
    console.log(`Checking gas fees for ${baseSepolia.name}...`);
    try {
        const { maxFeePerGas, maxPriorityFeePerGas } = await client.estimateFeesPerGas();

        if (maxFeePerGas === undefined || maxPriorityFeePerGas === undefined) {
            throw new Error('❌ Failed to estimate fees per gas. Received undefined values.');
        }
        
        console.log(`✅ Gas fees estimated successfully.`);

        const estimates: GasEstimate = {
            maxFeePerGas: maxFeePerGas.toString(),
            maxFeePerGasGwei: formatUnits(maxFeePerGas, 9), // Convert wei to gwei
            maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
            maxPriorityFeePerGasGwei: formatUnits(maxPriorityFeePerGas, 9) // Convert wei to gwei
        };
        
        return estimates;

    } catch (error: any) {
        console.error('❌ Error fetching gas estimates:', error);
        // Re-throw the error to indicate failure
        throw new Error(`Failed to check gas prices: ${error.message}`);
    }
}

// Example usage (optional, can be removed or kept for testing)
// check_gas()
//   .then(estimates => console.log('Gas Estimates:', estimates))
//   .catch(err => console.error(err));


// --- New Code for Transaction Fee Estimation ---

interface TransactionDetails {
  account: Account | Address; // The sender's account or address
  to: Address;              // Recipient address (or contract address)
  value?: bigint;           // ETH value to send (e.g., parseEther('0.01'))
  data?: `0x${string}`;      // Data for contract interaction (optional)
}

// Export the interface so it can be imported elsewhere
export interface FeeEstimateResult extends GasEstimate {
    estimatedGasUnits: string;
    estimatedTotalFeeWei: string;
    estimatedTotalFeeEther: string;
}

/**
 * Estimates the total gas fee for a specific transaction on Base Sepolia.
 */
export async function estimate_transaction_fee(tx: TransactionDetails): Promise<FeeEstimateResult> {
    console.log(`Estimating gas and fees for transaction to ${tx.to}...`);
    try {
        // 1. Estimate Gas Units required
        // Note: estimateGas requires the 'account' to potentially sign,
        // but for public client estimation, passing just the address *might* work
        // if the node doesn't strictly require account object. If errors occur,
        // a full Account object (with private key) or a different client setup might be needed.
        const estimatedGas = await client.estimateGas({
            account: tx.account, // This might need to be an actual Account object depending on RPC/client strictness
            to: tx.to,
            value: tx.value,
            data: tx.data,
        });
        const gasUnits = estimatedGas.toString();
        console.log(`✅ Estimated Gas Units: ${gasUnits}`);

        // 2. Get current fee estimates
        const { maxFeePerGas, maxPriorityFeePerGas } = await client.estimateFeesPerGas();

         if (maxFeePerGas === undefined || maxPriorityFeePerGas === undefined) {
            throw new Error('❌ Failed to estimate fees per gas. Received undefined values.');
        }
         console.log(`✅ Current Fee Data fetched.`);


        // 3. Calculate estimated total fee (using maxFeePerGas for simplicity, represents upper bound)
        const estimatedTotalFee = estimatedGas * maxFeePerGas;

        const feeResult: FeeEstimateResult = {
            maxFeePerGas: maxFeePerGas.toString(),
            maxFeePerGasGwei: formatUnits(maxFeePerGas, 9),
            maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
            maxPriorityFeePerGasGwei: formatUnits(maxPriorityFeePerGas, 9),
            estimatedGasUnits: gasUnits,
            estimatedTotalFeeWei: estimatedTotalFee.toString(),
            estimatedTotalFeeEther: formatUnits(estimatedTotalFee, 18) // Convert wei to Ether
        };

        console.log(`✅ Estimated Total Fee: ${feeResult.estimatedTotalFeeEther} ETH`);
        return feeResult;

    } catch (error: any) {
        console.error('❌ Error estimating transaction fee:', error);
        // Improve error logging for estimateGas issues
        if (error.message.includes('estimateGas')) {
             console.error('💡 Hint: estimateGas failure might be due to transaction reversion (e.g., insufficient funds, contract logic error) or incorrect parameters (like account type).');
        }
        throw new Error(`Failed to estimate transaction fee: ${error.message}`);
    }
}

// Example Usage (you would call this with actual transaction details)
/*
const exampleTx: TransactionDetails = {
    account: '0xYourSenderAddress', // Replace with actual sender address or Account object
    to: '0xRecipientAddress',     // Replace with actual recipient
    value: parseEther('0.01')     // Example value
    // data: '0x...' // Add if calling a contract
};

estimate_transaction_fee(exampleTx)
    .then(estimate => console.log('Full Fee Estimate:', estimate))
    .catch(err => console.error(err));
*/