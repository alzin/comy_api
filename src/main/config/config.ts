import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT || 5000,
  ORIGIN_URL: process.env.ORIGIN_URL || "http://localhost:3000",
  BASE_URL: process.env.BASE_URL || "http://localhost:5000/",
  NODE_ENV: process.env.NODE_ENV || "development",
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  DEV_MONGODB_URI: process.env.DEV_MONGODB_URI,
  PROD_MONGODB_URI: process.env.PROD_MONGODB_URI,
  TERMS_URL: process.env.TERMS_URL,
  JWT_SECRET: process.env.JWT_SECRET || "",
  JWT_EXPIRATION: "1h",
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || "",
  REFRESH_TOKEN_EXPIRATION: "7d",
  ACCESS_TOKEN_COOKIE_NAME: "access_token",
  REFRESH_TOKEN_COOKIE_NAME: "refresh_token",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || "",
};
