import { MongoUserRepository } from '../../infra/repo/MongoUserRepository';
import { NodemailerEmailService } from '../../infra/services/NodemailerEmailService';
import { BcryptPasswordHasher } from '../../infra/services/BcryptPasswordHasher';
import { JwtTokenService } from '../../infra/services/JwtTokenService';
import { CryptoRandomStringGenerator } from '../../infra/services/CryptoRandomStringGenerator';
import { AuthController } from '../../presentation/controllers/AuthController';
import { BusinessSheetRepository } from '../../infra/repo/BusinessSheetRepository';
import { BusinessSheetController } from '../../presentation/controllers/BusinessSheetController';
import { AWSImageUploadService } from '../../infra/services/AWSImageUploadService';
import { AuthUseCase } from '../../application/use-cases/auth/AuthUseCase';
import { BusinessSheetImageUploader } from '../../application/use-cases/business-sheet/BusinessSheetImageUploader';
import { CreateBusinessSheetUseCase } from '../../application/use-cases/business-sheet/CreateBusinessSheetUseCase';
import { EditBusinessSheetUseCase } from '../../application/use-cases/business-sheet/EditBusinessSheetUseCase';
import { GetBusinessSheetUseCase } from '../../application/use-cases/business-sheet/GetBusinessSheetUseCase';
import { ShareBusinessSheetUseCase } from '../../application/use-cases/business-sheet/ShareBusinessSheetUseCase';
import { StripeController } from '../../presentation/controllers/StripeController';
import { CreateBasicPlanCheckoutSessionUseCase } from '../../application/use-cases/payment/CreateBasicPlanCheckoutSessionUseCase';
import { StripeGateway } from '../../infra/gateways/StripeGateway';
import { GetAllUsersInfoUseCase } from '../../application/use-cases/users/GetAllUsersInfoUseCase';
import { GetAllUsersInfoController } from '../../presentation/controllers/GetAllUsersInfoController';
import { UpdateUserInfoUseCase } from '../../application/use-cases/users/UpdateUserInfoUseCase';
import { UpdateUserInfoController } from '../../presentation/controllers/UpdateUserInfoController';
import { SearchUsersUseCase } from '../../application/use-cases/users/SearchUsersUseCase';
import { SearchUsersController } from '../../presentation/controllers/SearchUsersController';
import { UpdateSubscriptionStatusUseCase } from '../../application/use-cases/payment/UpdateSubscriptionStatusUseCase';
import { StripeService } from '../../infra/services/StripeService';
import { WebhookController } from '../../presentation/controllers/WebhookController';
import { CheckSubscriptionStatusUseCase } from '../../application/use-cases/users/CheckSubscriptionStatusUseCase';
import { CheckSubscriptionStatusController } from '../../presentation/controllers/CheckSubscriptionStatusController';
import { BulkEmailSender } from '../../infra/services/BulkEmailSender';
import { ActiveUsersFetcher } from '../../infra/services/ActiveUsersFetcher';
import { SendActiveUsersEmailUseCase } from '../../application/use-cases/users/SendActiveUsersEmailUseCase';
import { ActiveUsersEmailController } from '../../presentation/controllers/ActiveUsersEmailController';
import { MongoChatRepository } from '../../chat/infra/repo/MongoChatRepository';
import { MongoMessageRepository } from '../../chat/infra/repo/MongoMessageRepository';
import { MongoBotMessageRepository } from '../../chat/infra/repo/MongoBotMessageRepository';
import { SocketIOService } from '../../chat/infra/services/SocketIOService';
import { CreateChatUseCase } from '../../chat/application/use-cases/CreateChatUseCase';
import { GetUserChatsUseCase } from '../../chat/application/use-cases/GetUserChatsUseCase';
import { SendMessageUseCase } from '../../chat/application/use-cases/SendMessageUseCase';
import { GetMessagesUseCase } from '../../chat/application/use-cases/GetMessagesUseCase';

import { MongoBlacklistRepository } from '/Users/lubna/Desktop/comy_back_new/comy_api/src/chat/infra/repo/MongoBlacklistRepository';
const VIRTUAL_USER_ID = '681547798892749fbe910c02';
const emailSender = new BulkEmailSender();
const activeUsersFetcher = new ActiveUsersFetcher();
const sendActiveUsersEmailUseCase = new SendActiveUsersEmailUseCase(activeUsersFetcher, emailSender);
export const activeUsersEmailController = new ActiveUsersEmailController(sendActiveUsersEmailUseCase);

export function setupDependencies(server: any) {
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
    randomStringGenerator
  );
  const authController = new AuthController(authUseCase);

  const businessSheetRepository = new BusinessSheetRepository();
  const imageUploadService = new AWSImageUploadService();
  const businessSheetImageUploader = new BusinessSheetImageUploader(imageUploadService);

  const createBusinessSheetUseCase = new CreateBusinessSheetUseCase(businessSheetRepository, businessSheetImageUploader);
  const editBusinessSheetUseCase = new EditBusinessSheetUseCase(businessSheetRepository, businessSheetImageUploader);
  const getBusinessSheetUseCase = new GetBusinessSheetUseCase(businessSheetRepository);
  const shareBusinessSheetUseCase = new ShareBusinessSheetUseCase(businessSheetRepository);

  const businessSheetController = new BusinessSheetController(
    createBusinessSheetUseCase,
    editBusinessSheetUseCase,
    getBusinessSheetUseCase,
    shareBusinessSheetUseCase
  );

  const stripeGateway = new StripeGateway();
  const createCheckoutSessionUseCase = new CreateBasicPlanCheckoutSessionUseCase(userRepository, stripeGateway);
  const stripeController = new StripeController(createCheckoutSessionUseCase);

  const getAllUsersInfoUseCase = new GetAllUsersInfoUseCase(userRepository);
  const getAllUsersInfoController = new GetAllUsersInfoController(getAllUsersInfoUseCase);

  const updateUserInfoUseCase = new UpdateUserInfoUseCase(userRepository);
  const updateUserInfoController = new UpdateUserInfoController(updateUserInfoUseCase);

  const searchUsersUseCase = new SearchUsersUseCase(userRepository);
  const searchUsersController = new SearchUsersController(searchUsersUseCase);

  const stripeService = new StripeService();
  const updateSubscriptionStatusUseCase = new UpdateSubscriptionStatusUseCase(userRepository);
  const webhookController = new WebhookController(stripeService, updateSubscriptionStatusUseCase);

  const checkSubscriptionStatusUseCase = new CheckSubscriptionStatusUseCase(userRepository);
  const checkSubscriptionStatusController = new CheckSubscriptionStatusController(checkSubscriptionStatusUseCase);

  const chatRepository = new MongoChatRepository();
  const messageRepository = new MongoMessageRepository();
  const botMessageRepository = new MongoBotMessageRepository();
  const socketService = new SocketIOService(server, userRepository, messageRepository);
  const createChatUseCase = new CreateChatUseCase(chatRepository);
  const getUserChatsUseCase = new GetUserChatsUseCase(chatRepository);
  const sendMessageUseCase = new SendMessageUseCase(messageRepository, chatRepository, socketService);
  const getMessagesUseCase = new GetMessagesUseCase(botMessageRepository);

  const chatService = { createChatUseCase, getUserChatsUseCase };
  const messageService = { sendMessageUseCase, getMessagesUseCase };
  const blacklistRepository = new MongoBlacklistRepository();

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
    activeUsersEmailController,
    socketService,
    chatService,
    messageService,
    botMessageRepository,
    messageRepository,
    chatRepository,
    sendMessageUseCase,
    blacklistRepository,
    virtualUserId: VIRTUAL_USER_ID
  };
}