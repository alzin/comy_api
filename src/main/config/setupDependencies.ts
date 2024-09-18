// src/main/config/setupDependencies.ts

import { UserRepository } from "../../infra/repo/UserRepository";
import { NodemailerEmailService } from "../../infra/services/NodemailerEmailService";
import { BcryptPasswordHasher } from "../../infra/services/BcryptPasswordHasher";
import { JwtTokenService } from "../../infra/services/JwtTokenService";
import { CryptoRandomStringGenerator } from "../../infra/services/CryptoRandomStringGenerator";
import { AuthUseCase } from "../../application/use-cases/AuthUseCase";
import { AuthController } from "../../presentation/controllers/AuthController";

import { BusinessSheetRepository } from "../../infra/repo/BusinessSheetRepository";
import { CreateBusinessSheetUseCase } from "../../application/use-cases/CreateBusinessSheetUseCase";
import { EditBusinessSheetUseCase } from "../../application/use-cases/EditBusinessSheetUseCase";
import { GetBusinessSheetUseCase } from "../../application/use-cases/GetBusinessSheetUseCase";
import { ShareBusinessSheetUseCase } from "../../application/use-cases/ShareBusinessSheetUseCase";
import { BusinessSheetController } from "../../presentation/controllers/BusinessSheetController";
import { AWSImageUploadService } from "../../infra/services/AWSImageUploadService";

export function setupDependencies() {
  const userRepository = new UserRepository();
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

  // Business sheet dependencies
  const businessSheetRepository = new BusinessSheetRepository();
  const imageUploadService = new AWSImageUploadService();

  const createBusinessSheetUseCase = new CreateBusinessSheetUseCase(
    businessSheetRepository,
    imageUploadService,
  );
  const editBusinessSheetUseCase = new EditBusinessSheetUseCase(
    businessSheetRepository,
    imageUploadService,
  );
  const getBusinessSheetUseCase = new GetBusinessSheetUseCase(
    businessSheetRepository,
  );
  const shareBusinessSheetUseCase = new ShareBusinessSheetUseCase(
    businessSheetRepository,
  );

  const businessSheetController = new BusinessSheetController(
    createBusinessSheetUseCase,
    editBusinessSheetUseCase,
    getBusinessSheetUseCase,
    shareBusinessSheetUseCase,
  );

  return {
    userRepository,
    tokenService,
    authController,
    businessSheetController,
  };
}
