import mongoose from "mongoose";
import { CONFIG } from "../../main/config/config";

export async function connectToDatabase() {
  const databaseUri =
    CONFIG.NODE_ENV === "development"
      ? CONFIG.DEV_MONGODB_URI
      : CONFIG.PROD_MONGODB_URI;

  if (!databaseUri) {
    throw new Error("Database URI is not defined in environment variables");
  }

  try {
    await mongoose.connect(databaseUri);
    console.log(`Connected to MongoDB (${CONFIG.NODE_ENV} environment)`);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}