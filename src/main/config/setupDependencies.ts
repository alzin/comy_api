// src/main/config/setupDependencies.ts

import { MongoUserRepository } from "../../infra/repo/MongoUserRepository";
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
import { CreateBasicPlanCheckoutSessionUseCase } from "../../application/use-cases/payment/CreateBasicPlanCheckoutSessionUseCase";
import { StripeGateway } from "../../infra/gateways/StripeGateway";
import { GetAllUsersInfoUseCase } from "../../application/use-cases/users/GetAllUsersInfoUseCase";
import { GetAllUsersInfoController } from "../../presentation/controllers/GetAllUsersInfoController";
import { UpdateUserInfoUseCase } from "../../application/use-cases/users/UpdateUserInfoUseCase";
import { UpdateUserInfoController } from "../../presentation/controllers/UpdateUserInfoController";
import { SearchUsersUseCase } from "../../application/use-cases/users/SearchUsersUseCase";
import { SearchUsersController } from "../../presentation/controllers/SearchUsersController";
import { UpdateSubscriptionStatusUseCase } from "../../application/use-cases/payment/UpdateSubscriptionStatusUseCase";
import { StripeService } from "../../infra/services/StripeService";
import { WebhookController } from "../../presentation/controllers/WebhookController";
import { CheckSubscriptionStatusUseCase } from "../../application/use-cases/users/CheckSubscriptionStatusUseCase";
import { CheckSubscriptionStatusController } from "../../presentation/controllers/CheckSubscriptionStatusController";

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
  const createCheckoutSessionUseCase =
    new CreateBasicPlanCheckoutSessionUseCase(userRepository, stripeGateway);
  const stripeController = new StripeController(createCheckoutSessionUseCase);

  const getAllUsersInfoUseCase = new GetAllUsersInfoUseCase(userRepository);
  const getAllUsersInfoController = new GetAllUsersInfoController(
    getAllUsersInfoUseCase,
  );

  const updateUserInfoUseCase = new UpdateUserInfoUseCase(userRepository);
  const updateUserInfoController = new UpdateUserInfoController(
    updateUserInfoUseCase,
  );

  const searchUsersUseCase = new SearchUsersUseCase(userRepository);
  const searchUsersController = new SearchUsersController(searchUsersUseCase);

  const stripeService = new StripeService();
  const updateSubscriptionStatusUseCase = new UpdateSubscriptionStatusUseCase(
    userRepository,
  );
  const webhookController = new WebhookController(
    stripeService,
    updateSubscriptionStatusUseCase,
  );

  const checkSubscriptionStatusUseCase = new CheckSubscriptionStatusUseCase(
    userRepository,
  );
  const checkSubscriptionStatusController =
    new CheckSubscriptionStatusController(checkSubscriptionStatusUseCase);

  return {
    userRepository,
    tokenService,
    authController,
    businessSheetController,
    stripeController,
    getAllUsersInfoController,
    updateUserInfoController,
    searchUsersController,
    webhookController,
    checkSubscriptionStatusController,
  };
}
