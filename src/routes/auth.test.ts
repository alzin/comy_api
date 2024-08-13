import request from "supertest";
import express from "express";
import authRouter from "./auth";

const app = express();
app.use(express.json());
app.use("/auth", authRouter);

describe("Auth Routes", () => {
  describe("POST /auth/register", () => {
    it("should register a new user successfully", async () => {
      const response = await request(app).post("/auth/register").send({
        email: "test@example.com",
        name: "Test User",
        password: "password123",
      });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("User registered successfully");
    });

    it("should return 400 if the user already exists", async () => {
      // Register the user once
      await request(app).post("/auth/register").send({
        email: "test2@example.com",
        name: "Test User 2",
        password: "password123",
      });

      // Try to register the same user again
      const response = await request(app).post("/auth/register").send({
        email: "test2@example.com",
        name: "Test User 2",
        password: "password123",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("User already exists");
    });

    it("should return 400 for invalid input", async () => {
      const response = await request(app).post("/auth/register").send({
        email: "not-an-email",
        name: "",
        password: "123",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid input");
    });
  });

  describe("POST /auth/login", () => {
    beforeAll(async () => {
      // Register a user to test login
      await request(app).post("/auth/register").send({
        email: "login@example.com",
        name: "Login User",
        password: "password123",
      });
    });

    it("should login successfully with correct credentials", async () => {
      const response = await request(app).post("/auth/login").send({
        email: "login@example.com",
        password: "password123",
      });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });

    it("should return 400 for incorrect email", async () => {
      const response = await request(app).post("/auth/login").send({
        email: "wrong@example.com",
        password: "password123",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid credentials");
    });

    it("should return 400 for incorrect password", async () => {
      const response = await request(app).post("/auth/login").send({
        email: "login@example.com",
        password: "wrongpassword",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid credentials");
    });
  });

  describe("GET /", () => {
    it("should return 200 with OK message", async () => {
      const app = express();
      app.get("/", (req, res) => {
        res.status(200).send("OK");
      });

      const response = await request(app).get("/");
      expect(response.status).toBe(200);
      expect(response.text).toBe("OK");
    });
  });
});