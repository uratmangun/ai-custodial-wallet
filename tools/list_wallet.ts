import { createDB } from '../utils/generic-db'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Create wallet database instance
let walletDB: ReturnType<typeof createDB>;

// Initialize the database


export async function list_wallet(): Promise<{
    wallets: Array<{
        id: string;
        publicKey: string;
    }>
}> {
    // Check if SECRET exists
    if (!process.env.SECRET) {
        throw new Error('❌ SECRET environment variable is not set. Please run generate_secret() first to create a secret key.')
    }
    try {
        walletDB = createDB('wallet');
        console.log('✅ Wallet database initialized for listing');
      } catch (error) {
        console.error('❌ Error initializing wallet database for listing:', error);
        // Re-throw the original error to halt execution and provide context
        throw error;
      }
    // Check if database is initialized - This check becomes somewhat redundant
    // if the error is re-thrown above, but we can leave it for robustness
    // in case of unexpected scenarios where the try block completes without error
    // but walletDB is still falsy.
    if (!walletDB) {
        throw new Error('❌ Wallet database is not initialized. Please check the logs for errors.')
    }

    // Get all wallets from database
    const wallets = await walletDB.getAll()
    
    // Return only id and publicKey
    return {wallets:wallets.length === 0 ? [] : wallets.map(wallet => ({
        id: wallet.id,
        publicKey: wallet.publicKey
    }))}
}