import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user";
import dotenv from "dotenv";
import { log } from "console";
dotenv.config();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET is not defined");
}

const router = express.Router();

// Mock database
const users: User[] = [];

router.post("/register", async (req, res) => {
  const { email, name, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { email, name, password: hashedPassword };
  users.push(user);
  log(users);

  res.status(201).json({ message: "User registered successfully" });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((user) => user.email === email);
  if (!user) {
    return res.status(400).json({ message: "Invalid username or password" });
  }
  const isPsswordValid = await bcrypt.compare(password, user.password);
  if (!isPsswordValid) {
    return res.status(400).json({ message: "Invalid username or password" });
  }
  const token = jwt.sign({ id: user.email }, jwtSecret, { expiresIn: "1h" });
  res.json({ token });
});

export default router;
