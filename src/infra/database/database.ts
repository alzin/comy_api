// src/infra/database/database.ts

import mongoose from "mongoose";
import { CONFIG } from "../../main/config/config";

const MONGODB_URI =
  CONFIG.NODE_ENV === "development"
    ? CONFIG.DEV_MONGODB_URI
    : CONFIG.PROD_MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MongoDB URI is not defined in environment variables");
}

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

let cached: CachedConnection = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    console.log("Using cached database connection");
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    console.log("No cached connection found. Creating a new connection...");
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log(
        `New connection to MongoDB (${CONFIG.NODE_ENV} environment) established`,
      );
      return mongoose;
    });
  } else {
    console.log("Connection is in progress. Waiting for it to complete...");
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    console.error("Error establishing database connection:", e);
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
