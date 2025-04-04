import crypto from 'crypto';


function generateSecretKey(): string {
  return crypto.randomBytes(32).toString('hex');
}



export function generate_secret(): {
  secret: string;
  createdAt: Date;
} {
  const secretKey = generateSecretKey();
  const now = new Date();
  

  
  return {
    secret: secretKey,
    createdAt: now
  };
}

// Execute if this is the main module
