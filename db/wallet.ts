import Datastore from 'nedb';
import { join } from 'path';

// Define wallet interface
export interface Wallet {
  _id?: string;
  userId: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

class WalletDB {
  private db: Datastore;

  constructor() {
    this.db = new Datastore({
      filename: join(process.cwd(), 'data', 'data.db'),
      autoload: true,
      timestampData: true
    });

    // Ensure indices
    this.db.ensureIndex({ fieldName: 'userId', unique: true });
  }

  // Create a new wallet
  async createWallet(walletData: Omit<Wallet, '_id' | 'createdAt' | 'updatedAt'>): Promise<Wallet> {
    const now = new Date();
    const wallet: Omit<Wallet, '_id'> = {
      ...walletData,
      createdAt: now,
      updatedAt: now
    };

    return new Promise((resolve, reject) => {
      this.db.insert(wallet, (err: Error | null, newDoc: Wallet) => {
        if (err) reject(err);
        else resolve(newDoc);
      });
    });
  }

  // Get wallet by user ID
  async getWalletByUserId(userId: string): Promise<Wallet | null> {
    return new Promise((resolve, reject) => {
      this.db.findOne({ userId }, (err: Error | null, doc: Wallet | null) => {
        if (err) reject(err);
        else resolve(doc);
      });
    });
  }

  // Get all wallets
  async getAllWallets(): Promise<Wallet[]> {
    return new Promise((resolve, reject) => {
      this.db.find({}, (err: Error | null, docs: Wallet[]) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });
  }

  // Update wallet
  async updateWallet(userId: string, update: Partial<Wallet>): Promise<Wallet | null> {
    const updateData = {
      ...update,
      updatedAt: new Date()
    };

    return new Promise((resolve, reject) => {
      this.db.update(
        { userId },
        { $set: updateData },
        { returnUpdatedDocs: true },
        (err: Error | null, numAffected: number, affectedDocuments: Wallet | null) => {
          if (err) reject(err);
          else resolve(affectedDocuments);
        }
      );
    });
  }

  // Delete wallet
  async deleteWallet(userId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.remove({ userId }, {}, (err: Error | null, numRemoved: number) => {
        if (err) reject(err);
        else resolve(numRemoved);
      });
    });
  }
}

// Export a singleton instance
export const walletDB = new WalletDB(); 