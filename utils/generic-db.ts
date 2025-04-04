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
    const dataDir = join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 Created data directory');
    }

    const dbPath = join(dataDir, `${collectionName}.db`);
    this.dbPath = dbPath;
    
    // Get encryption key from environment
    const secret = process.env.SECRET;
    if (!secret) {
      throw new Error('SECRET environment variable is not set. Please run the generate-secret tool first.');
    }
    this.encryptionKey = Buffer.from(secret, 'hex');

    try {
      // Initialize database with encryption hooks
      this.db = new Datastore({
        filename: this.dbPath,
        autoload: true, // Autoload handles creation/loading
        onload: (err) => { // Handle autoload errors
          if (err) {
            console.error(`❌ Error auto-loading database ${this.dbPath}:`, err);
            // Re-throw to signal a critical failure during startup
            throw new Error(`Failed to load database: ${err.message}`);
          } else {
            console.log(`✅ Database loaded successfully: ${this.dbPath}`);
            // Ensure indices after successful load
            this.db.ensureIndex({ fieldName: 'id', unique: true }, (indexErr) => {
              if (indexErr) {
                console.error(`❌ Error setting index on 'id':`, indexErr);
                // Decide if this is fatal or just a warning
              }
            });
          }
        },
        // Add serialization hooks for encryption
        afterSerialization: (plaintext: string) => {
          const iv = crypto.randomBytes(16);
          const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
          let encrypted = cipher.update(plaintext, 'utf8', 'hex');
          encrypted += cipher.final('hex');
          return `${iv.toString('hex')}:${encrypted}`;
        },
        // Add deserialization hooks for decryption
        beforeDeserialization: (ciphertext: string) => {
          // nedb passes an empty string for an empty file
          if (ciphertext === '') {
            return '';
          }
          try {
            const parts = ciphertext.split(':');
            if (parts.length !== 2) {
              throw new Error('Invalid encrypted data format (expected "iv:encryptedData").');
            }
            const [ivHex, encrypted] = parts;
            const iv = Buffer.from(ivHex, 'hex');
            if (iv.length !== 16) {
              throw new Error(`Invalid IV length: ${iv.length}. Expected 16 bytes.`);
            }
            const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
          } catch (error: any) {
            console.error('❌ Error decrypting or parsing database entry:', error);
            // Throwing an error signals nedb that loading this line failed
            throw new Error(`Decryption/parsing failed: ${error.message}`);
          }
        }
      });

      // Indices are now ensured within the onload callback

    } catch (error: any) {
      console.error('❌ Error initializing database:', error);
      throw new Error(`Failed to initialize database: ${error.message}`);
    }
  }

  // Create a new document
  async create<T extends Document>(data: Omit<T, '_id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const now = new Date();
    const document = {
      ...data,
      createdAt: now,
      updatedAt: now
    } as unknown as T;  // Safe to cast as we're adding the required fields

    return new Promise((resolve, reject) => {
      this.db.insert(document, (err: Error | null, newDoc: T) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(newDoc);
      });
    });
  }

  // Get document by ID
  async getById<T extends Document>(id: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.db.findOne({ id }, (err: Error | null, doc: T | null) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(doc);
      });
    });
  }

  // Get all documents
  async getAll<T extends Document>(): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.find({}, (err: Error | null, docs: T[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(docs);
      });
    });
  }

  // Find documents by query
  async find<T extends Document>(query: Query): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.find(query, (err: Error | null, docs: T[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(docs);
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
      this.db.update(
        { id },
        { $set: updateData },
        { returnUpdatedDocs: true },
        (err: Error | null, numAffected: number, affectedDocuments: T) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(affectedDocuments);
        }
      );
    });
  }

  // Delete document
  async delete(id: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.remove({ id }, {}, (err: Error | null, numRemoved: number) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(numRemoved);
      });
    });
  }

  // Delete multiple documents by query
  async deleteMany(query: Query): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.remove(query, { multi: true }, (err: Error | null, numRemoved: number) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(numRemoved);
      });
    });
  }

  // Count documents
  async count(query: Query = {}): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.count(query, (err: Error | null, count: number) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(count);
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