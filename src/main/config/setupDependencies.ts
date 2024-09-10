import { MongoUserRepository } from "../../infra/repositories/MongoUserRepository";
import { NodemailerEmailService } from "../../infra/services/NodemailerEmailService";
import { BcryptPasswordHasher } from "../../infra/services/BcryptPasswordHasher";
import { JwtTokenService } from "../../infra/services/JwtTokenService";
import { CryptoRandomStringGenerator } from "../../infra/services/CryptoRandomStringGenerator";
import { AuthUseCase } from "../../application/use-cases/AuthUseCase";
import { AuthController } from "../../presentation/controllers/AuthController";

export function setupDependencies() {
  const userRepository = new MongoUserRepository();
  const emailService = new NodemailerEmailService();
  const encryptionService = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService();
  const randomStringGenerator = new CryptoRandomStringGenerator();

  const authUseCase = new AuthUseCase(
    userRepository,
    emailService,
    encryptionService,
    tokenService,
    randomStringGenerator,
  );
  const authController = new AuthController(authUseCase);

  return {
    userRepository,
    tokenService,
    authController,
  };
}
