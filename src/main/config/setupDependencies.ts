// src/main/config/setupDependencies.ts

import { UserRepository } from "../../infra/repo/UserRepository";
import { NodemailerEmailService } from "../../infra/services/NodemailerEmailService";
import { BcryptPasswordHasher } from "../../infra/services/BcryptPasswordHasher";
import { JwtTokenService } from "../../infra/services/JwtTokenService";
import { CryptoRandomStringGenerator } from "../../infra/services/CryptoRandomStringGenerator";
import { AuthController } from "../../presentation/controllers/AuthController";
import { BusinessSheetRepository } from "../../infra/repo/BusinessSheetRepository";
import { BusinessSheetController } from "../../presentation/controllers/BusinessSheetController";
import { AWSImageUploadService } from "../../infra/services/AWSImageUploadService";
import { AuthUseCase } from "../../application/use-cases/auth/AuthUseCase";
import { CreateBusinessSheetUseCase } from "../../application/use-cases/business-sheet/CreateBusinessSheetUseCase";
import { EditBusinessSheetUseCase } from "../../application/use-cases/business-sheet/EditBusinessSheetUseCase";
import { GetBusinessSheetUseCase } from "../../application/use-cases/business-sheet/GetBusinessSheetUseCase";
import { ShareBusinessSheetUseCase } from "../../application/use-cases/business-sheet/ShareBusinessSheetUseCase";
import { StripeController } from "../../presentation/controllers/StripeController";
import { CreateCheckoutSessionUseCase } from "../../application/use-cases/payment/CreateCheckoutSessionUseCase";
import { StripeGateway } from "../../infra/gateways/StripeGateway";
import { GetAllUsersInfoUseCase } from "../../application/use-cases/users/GetAllUsersInfoUseCase";
import { GetAllUsersInfoController } from "../../presentation/controllers/GetAllUsersInfoController";
import { UpdateUserNameUseCase } from "../../application/use-cases/users/UpdateUserNameUseCase";
import { UpdateUserNameController } from "../../presentation/controllers/UpdateUserNameController";
import { SearchUsersUseCase } from "../../application/use-cases/users/SearchUsersUseCase";
import { SearchUsersController } from "../../presentation/controllers/SearchUsersController";

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

  const stripeGateway = new StripeGateway();
  const createCheckoutSessionUseCase = new CreateCheckoutSessionUseCase(
    userRepository,
    stripeGateway,
  );
  const stripeController = new StripeController(createCheckoutSessionUseCase);

  const getAllUsersInfoUseCase = new GetAllUsersInfoUseCase(userRepository);
  const getAllUsersInfoController = new GetAllUsersInfoController(
    getAllUsersInfoUseCase,
  );

  const updateUserNameUseCase = new UpdateUserNameUseCase(userRepository);
  const updateUserNameController = new UpdateUserNameController(
    updateUserNameUseCase,
  );

  const searchUsersUseCase = new SearchUsersUseCase(userRepository);
  const searchUsersController = new SearchUsersController(searchUsersUseCase);

  return {
    userRepository,
    tokenService,
    authController,
    businessSheetController,
    stripeController,
    getAllUsersInfoController,
    updateUserNameController,
    searchUsersController,
  };
}
