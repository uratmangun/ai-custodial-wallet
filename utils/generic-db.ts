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
    this.dbPath = join('data', `${collectionName}.db`);
    
    // Get encryption key from environment
    const secret = process.env.SECRET;
    if (!secret) {
      throw new Error('SECRET environment variable is not set. Please run the generate-secret tool first.');
    }
    this.encryptionKey = Buffer.from(secret, 'hex');

    try {
      // Ensure data directory exists
      if (!fs.existsSync('data')) {
        fs.mkdirSync('data', { recursive: true });
        console.log('📁 Created data directory');
      }

      // Check if database file exists, if not create it
      if (!fs.existsSync(this.dbPath)) {
        fs.writeFileSync(this.dbPath, '');
        console.log(`📄 Created database file: ${this.dbPath}`);
      }

      this.db = new Datastore({
        filename: this.dbPath,
        autoload: true,
        timestampData: true
      });

      // Ensure indices for common fields
      this.db.ensureIndex({ fieldName: 'id', unique: true });
    } catch (error: any) {
      console.error('❌ Error initializing database:', error);
      throw new Error(`Failed to initialize database: ${error.message}`);
    }
  }

  private encrypt(data: any): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decrypt(encryptedData: string): any {
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
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
      this.db.insert({ encryptedData }, (err: Error | null, newDoc: any) => {
        if (err) reject(err);
        else {
          const decryptedDoc = this.decrypt(newDoc.encryptedData);
          resolve(decryptedDoc);
        }
      });
    });
  }

  // Get document by ID
  async getById<T extends Document>(id: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.db.findOne({ id }, (err: Error | null, doc: any) => {
        if (err) reject(err);
        else if (!doc) resolve(null);
        else {
          const decryptedDoc = this.decrypt(doc.encryptedData);
          resolve(decryptedDoc);
        }
      });
    });
  }

  // Get all documents
  async getAll<T extends Document>(): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.find({}, (err: Error | null, docs: any[]) => {
        if (err) reject(err);
        else {
          const decryptedDocs = docs.map(doc => this.decrypt(doc.encryptedData));
          resolve(decryptedDocs);
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
        if (err) reject(err);
        else {
          const decryptedDocs = docs
            .map(doc => this.decrypt(doc.encryptedData))
            .filter(doc => this.applyQueryFilter(doc, query));
          resolve(decryptedDocs);
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
      this.db.findOne({ id }, (err: Error | null, doc: any) => {
        if (err) reject(err);
        else if (!doc) resolve(null);
        else {
          const decryptedDoc = this.decrypt(doc.encryptedData);
          const updatedDoc = { ...decryptedDoc, ...updateData };
          const encryptedData = this.encrypt(updatedDoc);
          
          this.db.update(
            { id },
            { $set: { encryptedData } },
            { returnUpdatedDocs: true },
            (err: Error | null, numAffected: number, affectedDocuments: any) => {
              if (err) reject(err);
              else resolve(updatedDoc);
            }
          );
        }
      });
    });
  }

  // Delete document
  async delete(id: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.remove({ id }, {}, (err: Error | null, numRemoved: number) => {
        if (err) reject(err);
        else resolve(numRemoved);
      });
    });
  }

  // Delete multiple documents by query
  async deleteMany(query: any): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.remove(query, { multi: true }, (err: Error | null, numRemoved: number) => {
        if (err) reject(err);
        else resolve(numRemoved);
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