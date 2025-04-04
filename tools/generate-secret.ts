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
if (import.meta.main) {
  const { secret } = generate_secret();
  console.log('Generated SECRET:');
  console.log(secret);
  console.log('\nPlease add this to your .env file as:');
  console.log(`SECRET=${secret}`);
}
