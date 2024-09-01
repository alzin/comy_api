import mongoose from 'mongoose';

export async function connectToDatabase() {
  const environment = process.env.NODE_ENV || 'dev';
  const databaseUri = environment === 'dev' 
    ? process.env.DEV_MONGODB_URI 
    : process.env.PROD_MONGODB_URI;

  if (!databaseUri) {
    throw new Error('Database URI is not defined in environment variables');
  }

  try {
    await mongoose.connect(databaseUri);
    console.log(`Connected to MongoDB (${environment} environment)`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}