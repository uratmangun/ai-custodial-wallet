import { privateKeyToAccount } from 'viem/accounts'
import { createDB } from '../utils/generic-db'
import crypto from 'crypto'
import dotenv from 'dotenv'
// Import fee estimation and types
import { estimate_transaction_fee, type FeeEstimateResult } from './check_gas';
// Import viem client/chain/transport components
import {
    type Address,
    type Account,
    createWalletClient,
    createPublicClient,
    http,
    formatUnits // Useful for logging
} from 'viem';
import { baseSepolia } from 'viem/chains';

// Load environment variables
dotenv.config()

// Create wallet database instance
let walletDB: ReturnType<typeof createDB>;

// Interface for the wallet document stored in the DB
// Assuming it has at least these fields based on previous create_wallet
interface WalletDocument {
    id: string;
    privateKey: `0x${string}`; // Assuming private key is stored as hex string
    publicKey: Address;
    createdAt: Date;
    updatedAt: Date;
    _id?: string; // NeDB internal ID
}

// Transaction details required for the transfer
interface TransferDetails {
    fromAddress: Address;
    toAddress: Address;
    value: bigint; // Value in wei
}

// Interface for the result of transfer_funds
// Update: Renamed and added transactionHash
interface TransferResult {
    estimatedFee: FeeEstimateResult; // Keep initial estimate for info
    transactionHash: `0x${string}`;
    fromAddress: Address;
    toAddress: Address;
    valueSentEther: string; // Value in Ether
}

// Create a public client instance (can be reused)
// Ensure your .env or environment has the RPC URL if needed, otherwise uses default public
const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
});

export async function transfer_funds(
    // Transfer details are mandatory
    transferDetails: TransferDetails
): Promise<TransferResult> { // Updated return type
    // Check if SECRET exists
    if (!process.env.SECRET) {
        throw new Error('❌ SECRET environment variable is not set. Please run generate_secret() first to create a secret key.')
    }
    // Ensure transfer details are provided
    if (!transferDetails) {
        throw new Error('❌ Transfer details (fromAddress, toAddress, value) are required.');
    }

    try {
        // Initialize DB if not already done (idempotent)
        if (!walletDB) {
             walletDB = createDB('wallet');
             console.log('✅ Wallet database initialized');
        }
      } catch (error) {
        console.error('❌ Error initializing wallet database:', error);
        throw error; // Re-throw critical error
      }

    // --- Fetch Private Key from Database ---
    console.log(`🔍 Fetching wallet details for address: ${transferDetails.fromAddress}...`);
    let privateKey: `0x${string}`;
    let account: Account;

    try {
        // Find the wallet using the public key (address)
        // The query should match the field name used when creating the wallet (publicKey)
        const walletRecord = await walletDB.find<WalletDocument>({ publicKey: transferDetails.fromAddress });

        if (!walletRecord || walletRecord.length === 0) {
            throw new Error(`❌ Wallet not found for address: ${transferDetails.fromAddress}`);
        }
        if (walletRecord.length > 1) {
             console.warn(`⚠️ Multiple wallet records found for address ${transferDetails.fromAddress}. Using the first one.`);
        }

        // Assuming the privateKey field exists and is the correct type
        privateKey = walletRecord[0].privateKey;
        if (!privateKey) {
            throw new Error(`❌ Private key not found in the database record for address: ${transferDetails.fromAddress}`);
        }

        console.log(`✅ Wallet record found.`);

        // Reconstruct the account object from the private key
        account = privateKeyToAccount(privateKey);

        // Verify the reconstructed address matches the requested fromAddress
        if (account.address.toLowerCase() !== transferDetails.fromAddress.toLowerCase()) {
            throw new Error(`❌ Security Alert: Reconstructed address (${account.address}) does not match requested fromAddress (${transferDetails.fromAddress}). Aborting.`);
        }
        console.log(`✅ Account object reconstructed successfully.`);

    } catch (error: any) {
        console.error(`❌ Error fetching or processing wallet data: ${error.message}`);
        throw error; // Re-throw to indicate failure
    }

    // --- Initial Fee Estimation (Optional but good for pre-check/logging) ---
    let initialFeeEstimate: FeeEstimateResult | null = null; // Initialize to null
    console.log(`ℹ️ Performing initial fee estimation for transfer...`);
    try {
        const txDetailsForEstimation = {
            account: account, // Use the reconstructed account
            to: transferDetails.toAddress,
            value: transferDetails.value
        };
        initialFeeEstimate = await estimate_transaction_fee(txDetailsForEstimation);
        console.log(`✅ Initial Estimated Fee: ${initialFeeEstimate.estimatedTotalFeeEther} ETH`);
    } catch (error: any) {
        console.warn(`⚠️ Initial fee estimation failed: ${error.message}. Proceeding with send attempt...`);
        // Allow proceeding even if initial estimation fails, but handle potential null `initialFeeEstimate` later if needed
    }

    // --- Prepare and Send Transaction --- 
    console.log(`🚀 Preparing to send ${formatUnits(transferDetails.value, 18)} ETH from ${account.address} to ${transferDetails.toAddress}...`);

    try {
        // Create a wallet client associated with the fetched account
        const walletClient = createWalletClient({
            account,
            chain: baseSepolia,
            transport: http() // Use same transport as public client or configure specific one
        });

        // Get CURRENT gas fees right before sending
        console.log("⛽ Fetching current gas fees...");
        const { maxFeePerGas, maxPriorityFeePerGas } = await publicClient.estimateFeesPerGas();
        if (!maxFeePerGas || !maxPriorityFeePerGas) {
            throw new Error('❌ Failed to fetch current gas fees (maxFeePerGas or maxPriorityFeePerGas is undefined).');
        }
        console.log(`   Current Max Fee: ${formatUnits(maxFeePerGas, 9)} Gwei, Current Priority Fee: ${formatUnits(maxPriorityFeePerGas, 9)} Gwei`);


        // Send the transaction
        console.log("💸 Sending transaction...");
        const hash = await walletClient.sendTransaction({
            to: transferDetails.toAddress,
            value: transferDetails.value,
            account: account, // Ensure account is passed if not implicitly handled by client context
            chain: baseSepolia, // Ensure chain is specified
            maxFeePerGas: maxFeePerGas,           // Use current max fee
            maxPriorityFeePerGas: maxPriorityFeePerGas // Use current priority fee
            // nonce, gas, etc., can be added if needed, but viem usually handles them
        });

        console.log(`✅ Transaction sent successfully! Hash: ${hash}`);
        console.log(`   View on Etherscan (Base Sepolia): https://sepolia.basescan.org/tx/${hash}`);

        // Prepare the final result
        const result: TransferResult = {
            // Use initial estimate if available, otherwise create a placeholder or omit
            estimatedFee: initialFeeEstimate || { 
                maxFeePerGas: 'N/A', 
                maxFeePerGasGwei: 'N/A', 
                maxPriorityFeePerGas: 'N/A', 
                maxPriorityFeePerGasGwei: 'N/A',
                estimatedGasUnits: 'N/A',
                estimatedTotalFeeWei: 'N/A',
                estimatedTotalFeeEther: 'N/A'
             }, 
            transactionHash: hash,
            fromAddress: account.address,
            toAddress: transferDetails.toAddress,
            valueSentEther: formatUnits(transferDetails.value, 18) // Convert wei bigint to Ether string
        };

        return result;

    } catch (error: any) {
        console.error(`❌ Error sending transaction: ${error.message}`);
        // Provide more specific hints for common errors
        if (error.message.includes('insufficient funds')) {
             console.error('💡 Hint: The sending wallet (${account.address}) likely does not have enough ETH to cover the amount + gas fees.');
        } else if (error.message.includes('nonce')) {
             console.error('💡 Hint: Nonce error. Check if another transaction from this account is pending or if the nonce calculation is off.');
        } else if (error.shortMessage) { // Viem often provides a shorter summary
            console.error(`❌ Transaction Failed: ${error.shortMessage}`);
        }
        // Re-throw a more specific error
        throw new Error(`Failed to send transaction: ${error.message}`);
    }
}

// Example Usage (Illustrative) - Keep commented out
/*
import { parseEther } from 'viem'; // No longer need formatUnits here if handled internally

async function example() {
    try {
        const senderAddress: Address = '0xYourSenderAddressFromDB'; // Replace with address stored in DB
        const recipientAddress: Address = '0xRecipientAddressHere'; // Replace with target recipient
        const amountToSend = parseEther('0.001'); // Example: 0.001 ETH in wei (adjust amount)

        console.log(`Attempting to send ${formatUnits(amountToSend, 18)} ETH from ${senderAddress} to ${recipientAddress}...`);

        // Ensure the sender address is funded on Base Sepolia before running!
        const transferResult = await transfer_funds({
            fromAddress: senderAddress,
            toAddress: recipientAddress,
            value: amountToSend
        });

        console.log('\n--- Transfer Successful ---');
        console.log('Transaction Details:', transferResult);
        console.log(`Transaction Hash: ${transferResult.transactionHash}`);
        console.log(`Sent: ${transferResult.valueSentEther} ETH`);
        console.log(`From: ${transferResult.fromAddress}`);
        console.log(`To: ${transferResult.toAddress}`);
        console.log(`Initial Estimated Fee: ~${transferResult.estimatedFee.estimatedTotalFeeEther} ETH`);
        console.log(`View on Base Sepolia Scan: https://sepolia.basescan.org/tx/${transferResult.transactionHash}`);

    } catch (error) {
        console.error('\n--- Example Usage Failed ---', error);
    }
}

// Make sure SECRET is set and the senderAddress exists in wallet.db and IS FUNDED on Base Sepolia
// example(); // Uncomment to run example
*/