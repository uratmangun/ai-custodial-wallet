import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { createDB } from '../utils/generic-db'
import crypto from 'crypto'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Create wallet database instance
const walletDB = createDB('wallet')

export async function create_wallet(): Promise<{ 
    id: string; 
    publicKey: string;
    createdAt: Date; 
    updatedAt: Date 
}> {
    // Check if SECRET exists
    if (!process.env.SECRET) {
        throw new Error('❌ SECRET environment variable is not set. Please run generate_secret() first to create a secret key.')
    }

    // Generate a unique ID for the wallet
    const id = crypto.randomBytes(16).toString('hex')
    
    // Generate private key
    const privateKey = generatePrivateKey()
    
    // Get public key from private key
    const account = privateKeyToAccount(privateKey)
    const publicKey = account.address
    
    const now = new Date()
    
    // Save to encrypted database
    await walletDB.create({
        id,
        privateKey,
        publicKey,
        createdAt: now,
        updatedAt: now
    })
    
    return {
        id,
        publicKey,
        createdAt: now,
        updatedAt: now
    }
}