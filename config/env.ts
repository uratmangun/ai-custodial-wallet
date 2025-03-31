import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env file
config();

// Environment variable validation and defaults
interface EnvConfig {
  databasePath: string;
  nodeEnv: string;
  apiKey: string;
  defaultWalletType: 'hot' | 'cold';
  maxWalletsPerUser: number;
}

// Function to get a required environment variable
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Function to get an optional environment variable with a default value
function optionalEnv<T>(key: string, defaultValue: T): string | T {
  const value = process.env[key];
  return value !== undefined ? value : defaultValue;
}

// Export configuration object
export const env: EnvConfig = {
  databasePath: optionalEnv('DATABASE_PATH', join(process.cwd(), 'data', 'wallets.db')),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  apiKey: requireEnv('API_KEY'),
  defaultWalletType: optionalEnv('DEFAULT_WALLET_TYPE', 'hot') as 'hot' | 'cold',
  maxWalletsPerUser: parseInt(optionalEnv('MAX_WALLETS_PER_USER', '5'), 10),
}; 