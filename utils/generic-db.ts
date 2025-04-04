import Datastore from 'nedb';
import { join } from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Define a generic interface for any document
export interface Document {
  _id?: string;
  [key: string]: any;
}

// Define query operators
interface QueryOperators {
  $gt?: number;
  $lt?: number;
  $gte?: number;
  $lte?: number;
  $ne?: any;
  $in?: any[];
}

type QueryValue = any | QueryOperators;

interface Query {
  [key: string]: QueryValue;
}

class GenericDB {
  private db: Datastore;
  private collectionName: string;
  private encryptionKey: Buffer;
  private dbPath: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
    
    // Create data directory if it doesn't exist
    const dataDir = 'data';
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 Created data directory');
    }

    this.dbPath = join(dataDir, `${collectionName}.db`);
    
    // Get encryption key from environment
    const secret = process.env.SECRET;
    if (!secret) {
      throw new Error('SECRET environment variable is not set. Please run the generate-secret tool first.');
    }
    this.encryptionKey = Buffer.from(secret, 'hex');

    try {
      // Initialize in-memory database
      this.db = new Datastore({ inMemoryOnly: true });

      // Load data from file if it exists
      if (fs.existsSync(this.dbPath)) {
        const data = fs.readFileSync(this.dbPath, 'utf8');
        if (data) {
          const records = data.split('\n').filter(Boolean).map(line => JSON.parse(line));
          records.forEach(record => {
            this.db.insert(record);
          });
        }
      } else {
        // Create empty database file
        fs.writeFileSync(this.dbPath, '');
        console.log(`📄 Created database file: ${this.dbPath}`);
      }

      // Ensure indices for common fields
      this.db.ensureIndex({ fieldName: 'id', unique: true });
    } catch (error: any) {
      console.error('❌ Error initializing database:', error);
      throw new Error(`Failed to initialize database: ${error.message}`);
    }
  }

  private async syncToFile(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.find({}, (err: Error | null, docs: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        try {
          const data = docs.map(doc => JSON.stringify(doc)).join('\n') + '\n';
          fs.writeFileSync(this.dbPath, data, 'utf8');
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private encrypt(data: any): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decrypt(encryptedData: string): any {
    if (!encryptedData) {
      console.warn('Warning: Attempted to decrypt undefined or null data');
      return null;
    }

    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        console.warn('Warning: Invalid encrypted data format');
        return null;
      }

      const [ivHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Error decrypting data:', error);
      return null;
    }
  }

  // Create a new document
  async create<T extends Document>(data: Omit<T, '_id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const now = new Date();
    const document = {
      ...data,
      createdAt: now,
      updatedAt: now
    } as unknown as T;

    // Encrypt the document data
    const encryptedData = this.encrypt(document);

    return new Promise((resolve, reject) => {
      this.db.insert({ encryptedData }, async (err: Error | null, newDoc: any) => {
        if (err) {
          reject(err);
          return;
        }
        try {
          await this.syncToFile();
          const decryptedDoc = this.decrypt(newDoc.encryptedData);
          resolve(decryptedDoc);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  // Get document by ID
  async getById<T extends Document>(id: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.db.findOne({ id }, (err: Error | null, doc: any) => {
        if (err) {
          reject(err);
          return;
        }
        if (!doc || !doc.encryptedData) {
          resolve(null);
          return;
        }
        try {
          const decryptedDoc = this.decrypt(doc.encryptedData);
          resolve(decryptedDoc);
        } catch (error) {
          console.error('Error decrypting document:', error);
          resolve(null);
        }
      });
    });
  }

  // Get all documents
  async getAll<T extends Document>(): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.find({}, (err: Error | null, docs: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        try {
          const decryptedDocs = docs
            .filter(doc => doc && doc.encryptedData)
            .map(doc => this.decrypt(doc.encryptedData))
            .filter(doc => doc !== null);
          resolve(decryptedDocs);
        } catch (error) {
          console.error('Error decrypting documents:', error);
          resolve([]);
        }
      });
    });
  }

  private applyQueryFilter(doc: any, query: Query): boolean {
    return Object.entries(query).every(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        const operators = value as QueryOperators;
        if (operators.$gt !== undefined) return doc[key] > operators.$gt;
        if (operators.$lt !== undefined) return doc[key] < operators.$lt;
        if (operators.$gte !== undefined) return doc[key] >= operators.$gte;
        if (operators.$lte !== undefined) return doc[key] <= operators.$lte;
        if (operators.$ne !== undefined) return doc[key] !== operators.$ne;
        if (operators.$in !== undefined) return operators.$in.includes(doc[key]);
      }
      return doc[key] === value;
    });
  }

  // Find documents by query
  async find<T extends Document>(query: Query): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.find({}, (err: Error | null, docs: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        try {
          const decryptedDocs = docs
            .filter(doc => doc && doc.encryptedData)
            .map(doc => this.decrypt(doc.encryptedData))
            .filter(doc => doc !== null)
            .filter(doc => this.applyQueryFilter(doc, query));
          resolve(decryptedDocs);
        } catch (error) {
          console.error('Error finding documents:', error);
          resolve([]);
        }
      });
    });
  }

  // Update document
  async update<T extends Document>(id: string, update: Partial<T>): Promise<T | null> {
    const updateData = {
      ...update,
      updatedAt: new Date()
    };

    return new Promise((resolve, reject) => {
      this.db.findOne({ id }, async (err: Error | null, doc: any) => {
        if (err) {
          reject(err);
          return;
        }
        if (!doc) {
          resolve(null);
          return;
        }
        
        const decryptedDoc = this.decrypt(doc.encryptedData);
        const updatedDoc = { ...decryptedDoc, ...updateData };
        const encryptedData = this.encrypt(updatedDoc);
        
        this.db.update(
          { id },
          { $set: { encryptedData } },
          { returnUpdatedDocs: true },
          async (err: Error | null, numAffected: number, affectedDocuments: any) => {
            if (err) {
              reject(err);
              return;
            }
            try {
              await this.syncToFile();
              resolve(updatedDoc);
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    });
  }

  // Delete document
  async delete(id: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.remove({ id }, {}, async (err: Error | null, numRemoved: number) => {
        if (err) {
          reject(err);
          return;
        }
        try {
          await this.syncToFile();
          resolve(numRemoved);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  // Delete multiple documents by query
  async deleteMany(query: any): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.remove(query, { multi: true }, async (err: Error | null, numRemoved: number) => {
        if (err) {
          reject(err);
          return;
        }
        try {
          await this.syncToFile();
          resolve(numRemoved);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  // Count documents
  async count(query: Query = {}): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.find({}, (err: Error | null, docs: any[]) => {
        if (err) reject(err);
        else {
          const count = docs
            .map(doc => this.decrypt(doc.encryptedData))
            .filter(doc => this.applyQueryFilter(doc, query))
            .length;
          resolve(count);
        }
      });
    });
  }
}

// Export a factory function to create database instances
export const createDB = (collectionName: string) => new GenericDB(collectionName);

// Example usage:
// const walletDB = createDB('wallets');
// const userDB = createDB('users');
// const transactionDB = createDB('transactions'); 