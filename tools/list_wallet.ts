import { createDB } from '../utils/generic-db'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Create wallet database instance
const walletDB = createDB('wallet')

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

    // Get all wallets from database
    const wallets = await walletDB.getAll()
    
    // Return only id and publicKey
    return {wallets:wallets.length === 0 ? [] : wallets.map(wallet => ({
        id: wallet.id,
        publicKey: wallet.publicKey
    }))}
}