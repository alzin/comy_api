import { UserRepository } from "./UserRepository";

describe("UserRepository", () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepository();
  });

  describe("findByEmail", () => {
    it("should return null if user not found", async () => {
      const user = await userRepository.findByEmail("nonexistent@example.com");
      expect(user).toBeNull();
    });

    it("should return user if found", async () => {
      const newUser = {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        password: "hashedPassword",
        isVerified: false,
        verificationToken: "token",
      };
      await userRepository.save(newUser);

      const foundUser = await userRepository.findByEmail("test@example.com");
      expect(foundUser).toEqual(newUser);
    });
  });

  describe("findByVerificationToken", () => {
    it("should return null if user not found", async () => {
      const user =
        await userRepository.findByVerificationToken("nonexistent-token");
      expect(user).toBeNull();
    });

    it("should return user if found", async () => {
      const newUser = {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        password: "hashedPassword",
        isVerified: false,
        verificationToken: "valid-token",
      };
      await userRepository.save(newUser);

      const foundUser =
        await userRepository.findByVerificationToken("valid-token");
      expect(foundUser).toEqual(newUser);
    });
  });

  describe("save", () => {
    it("should add a new user", async () => {
      const newUser = {
        id: "",
        email: "test@example.com",
        name: "Test User",
        password: "hashedPassword",
        isVerified: false,
        verificationToken: "token",
      };
      await userRepository.save(newUser);

      const savedUser = await userRepository.findByEmail("test@example.com");
      expect(savedUser).toBeDefined();
      expect(savedUser?.id).toBeDefined();
      expect(savedUser?.email).toBe(newUser.email);
    });

    it("should update an existing user", async () => {
      const user = {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        password: "hashedPassword",
        isVerified: false,
        verificationToken: "token",
      };
      await userRepository.save(user);

      user.name = "Updated Name";
      await userRepository.save(user);

      const updatedUser = await userRepository.findByEmail("test@example.com");
      expect(updatedUser?.name).toBe("Updated Name");
    });
  });

  describe("update", () => {
    it("should update an existing user", async () => {
      const user = {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        password: "hashedPassword",
        isVerified: false,
        verificationToken: "token",
      };
      await userRepository.save(user);

      user.isVerified = true;
      await userRepository.update(user);

      const updatedUser = await userRepository.findByEmail("test@example.com");
      expect(updatedUser?.isVerified).toBe(true);
    });

    it("should throw an error if user does not exist", async () => {
      const nonExistentUser = {
        id: "nonexistent",
        email: "nonexistent@example.com",
        name: "Non Existent",
        password: "hashedPassword",
        isVerified: false,
        verificationToken: "token",
      };

      await expect(userRepository.update(nonExistentUser)).rejects.toThrow(
        "User not found",
      );
    });
  });
});
