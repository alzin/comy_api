import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
  NODE_ENV: process.env.NODE_ENV || "development",
  FRONT_URL: process.env.FRONT_URL || "http://localhost:3000",
  SERVER_URL: process.env.SERVER_URL || "http://localhost:5000/",
  PORT: process.env.PORT || 8080,

  GMAIL_USER: process.env.GMAIL_USER,
  GMAIL_PASS: process.env.GMAIL_PASS,

  BASIC_PLAN_PRICE_ID: "price_1Q4EKPI6nAuCGeztX9VXBXL7",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",

  DEV_MONGODB_URI: process.env.DEV_MONGODB_URI,
  PROD_MONGODB_URI: process.env.PROD_MONGODB_URI,

  JWT_SECRET: process.env.JWT_SECRET || "",
  JWT_EXPIRATION: "24h",
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || "",
  REFRESH_TOKEN_EXPIRATION: "7d",
  ACCESS_TOKEN_COOKIE_NAME: "access_token",
  REFRESH_TOKEN_COOKIE_NAME: "refresh_token",

  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || "",
};
