import mongoose from "mongoose";
import env from "../../main/config/env";

export async function connectToDatabase() {
  const databaseUri = env.node === "dev" ? env.devMongoUri: env.prodMongoUri;

  if (!databaseUri) {
    throw new Error("Database URI is not defined in environment variables");
  }

  try {
    await mongoose.connect(databaseUri);
    console.log(`Connected to MongoDB (${env.node} environment)`);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}