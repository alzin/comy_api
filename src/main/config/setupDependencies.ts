import { CONFIG } from "./config"

//services
import { SocketIOService } from '../../chat/infra/services/SocketIOService';
import { VirtualChatService } from '../../chat/infra/services/VirtualChatService';
import { NodemailerEmailService } from '../../infra/services/NodemailerEmailService';
import { BcryptPasswordHasher } from '../../infra/services/BcryptPasswordHasher';
import { JwtTokenService } from '../../infra/services/JwtTokenService';
import { CryptoRandomStringGenerator } from '../../infra/services/CryptoRandomStringGenerator';
import { AWSImageUploadService } from '../../infra/services/AWSImageUploadService';
import { StripeService } from '../../infra/services/StripeService';
import { BulkEmailSender } from '../../infra/services/BulkEmailSender';
import { ActiveUsersFetcher } from '../../infra/services/ActiveUsersFetcher';

// controllers
import { MessageController } from '../../chat/presentation/controllers/MessageController';
import { ChatController } from '../../chat/presentation/controllers/ChatController';
import { AuthController } from '../../presentation/controllers/AuthController';
import { BusinessSheetController } from '../../presentation/controllers/BusinessSheetController';
import { StripeController } from '../../presentation/controllers/StripeController';
import { GetAllUsersInfoController } from '../../presentation/controllers/GetAllUsersInfoController';
import { UpdateUserInfoController } from '../../presentation/controllers/UpdateUserInfoController';
import { SearchUsersController } from '../../presentation/controllers/SearchUsersController';
import { WebhookController } from '../../presentation/controllers/WebhookController';
import { CheckSubscriptionStatusController } from '../../presentation/controllers/CheckSubscriptionStatusController';
import { ActiveUsersEmailController } from '../../presentation/controllers/ActiveUsersEmailController';

// use-cases
import { AuthUseCase } from '../../application/use-cases/auth/AuthUseCase';
import { SendMessageUseCase } from '../../chat/application/use-cases/SendMessageUseCase';
import { GetMessagesUseCase } from '../../chat/application/use-cases/GetMessagesUseCase';
import { CreateChatUseCase } from '../../chat/application/use-cases/CreateChatUseCase';
import { GetUserChatsUseCase } from '../../chat/application/use-cases/GetUserChatsUseCase';
import { BusinessSheetImageUploader } from '../../application/use-cases/business-sheet/BusinessSheetImageUploader';
import { CreateBusinessSheetUseCase } from '../../application/use-cases/business-sheet/CreateBusinessSheetUseCase';
import { EditBusinessSheetUseCase } from '../../application/use-cases/business-sheet/EditBusinessSheetUseCase';
import { GetBusinessSheetUseCase } from '../../application/use-cases/business-sheet/GetBusinessSheetUseCase';
import { ShareBusinessSheetUseCase } from '../../application/use-cases/business-sheet/ShareBusinessSheetUseCase';
import { CreateBasicPlanCheckoutSessionUseCase } from '../../application/use-cases/payment/CreateBasicPlanCheckoutSessionUseCase';
import { GetAllUsersInfoUseCase } from '../../application/use-cases/users/GetAllUsersInfoUseCase';
import { UpdateUserInfoUseCase } from '../../application/use-cases/users/UpdateUserInfoUseCase';
import { SearchUsersUseCase } from '../../application/use-cases/users/SearchUsersUseCase';
import { UpdateSubscriptionStatusUseCase } from '../../application/use-cases/payment/UpdateSubscriptionStatusUseCase';
import { CheckSubscriptionStatusUseCase } from '../../application/use-cases/users/CheckSubscriptionStatusUseCase';
import { SendActiveUsersEmailUseCase } from '../../application/use-cases/users/SendActiveUsersEmailUseCase';
import { GenerateBotResponseUseCase } from '../../chat/application/use-cases/GenerateBotResponseUseCase';
import { UpdateReferrerNameUseCase } from '../../application/use-cases/payment/UpdateReferrerNameUseCase';

// repository
import { MongoMessageRepository } from '../../chat/infra/repo/MongoMessageRepository';
import { MongoChatRepository } from '../../chat/infra/repo/MongoChatRepository';
import { MongoFriendRepository } from '../../chat/infra/repo/MongoFriendRepository';
import { MongoUserRepository } from '../../infra/repo/MongoUserRepository';
import { MongoBotMessageRepository } from '../../chat/infra/repo/MongoBotMessageRepository';
import { MongoBlacklistRepository } from '../../chat/infra/repo/MongoBlacklistRepository';
import { BusinessSheetRepository } from '../../infra/repo/BusinessSheetRepository';
import { StripeGateway } from '../../infra/gateways/StripeGateway';
import { MongoSuggestedPairRepository } from '../../chat/infra/repo/MongoSuggestedPairRepository';



export function setupDependencies(server: any) {

  const virtualUserId = CONFIG.BOT_ID;
  if (!virtualUserId) {
    throw new Error('BOT_ID is not defined in .env');
  }

  const adminBotId = CONFIG.ADMIN;
  if (!adminBotId) {
    throw new Error('ADMIN is not defined in .env');
  }


  // Repository
  const userRepository = new MongoUserRepository();
  const chatRepository = new MongoChatRepository();
  const messageRepository = new MongoMessageRepository(chatRepository); // Pass chatRepository
  const botMessageRepository = new MongoBotMessageRepository();
  const blacklistRepository = new MongoBlacklistRepository();
  const friendRepository = new MongoFriendRepository();
  const businessSheetRepository = new BusinessSheetRepository();
  const stripeGateway = new StripeGateway();
  const suggestedPairRepository = new MongoSuggestedPairRepository();


  // services
  const socketService = new SocketIOService(server, userRepository, messageRepository);
  socketService.initialize();
  const virtualChatService = new VirtualChatService();
  const emailService = new NodemailerEmailService();
  const encryptionService = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService();
  const randomStringGenerator = new CryptoRandomStringGenerator();
  const imageUploadService = new AWSImageUploadService();
  const stripeService = new StripeService();
  const emailSender = new BulkEmailSender();
  const activeUsersFetcher = new ActiveUsersFetcher();


  // use-cases
  const authUseCase = new AuthUseCase(
    userRepository,
    emailService,
    encryptionService,
    tokenService,
    randomStringGenerator
  );

  const generateBotResponseUseCase = new GenerateBotResponseUseCase(chatRepository);

  const sendMessageUseCase = new SendMessageUseCase(
    messageRepository,
    chatRepository,
    socketService,
    generateBotResponseUseCase,
    userRepository
  );

  const sendActiveUsersEmailUseCase = new SendActiveUsersEmailUseCase(activeUsersFetcher, emailSender);
  const businessSheetImageUploader = new BusinessSheetImageUploader(imageUploadService);
  const createBusinessSheetUseCase = new CreateBusinessSheetUseCase(businessSheetRepository, businessSheetImageUploader);
  const editBusinessSheetUseCase = new EditBusinessSheetUseCase(businessSheetRepository, businessSheetImageUploader);
  const getBusinessSheetUseCase = new GetBusinessSheetUseCase(businessSheetRepository);
  const shareBusinessSheetUseCase = new ShareBusinessSheetUseCase(businessSheetRepository);
  const createCheckoutSessionUseCase = new CreateBasicPlanCheckoutSessionUseCase(userRepository, stripeGateway);
  const getAllUsersInfoUseCase = new GetAllUsersInfoUseCase(userRepository);
  const updateUserInfoUseCase = new UpdateUserInfoUseCase(userRepository);
  const searchUsersUseCase = new SearchUsersUseCase(userRepository);
  const updateSubscriptionStatusUseCase = new UpdateSubscriptionStatusUseCase(userRepository);
  const updateReferrerNameUseCase = new UpdateReferrerNameUseCase(userRepository);
  const checkSubscriptionStatusUseCase = new CheckSubscriptionStatusUseCase(userRepository);
  const createChatUseCase = new CreateChatUseCase(chatRepository, userRepository);
  const getUserChatsUseCase = new GetUserChatsUseCase(chatRepository, userRepository);
  const getMessagesUseCase = new GetMessagesUseCase(messageRepository);

  // controllers
  const authController = new AuthController(authUseCase);
  const activeUsersEmailController = new ActiveUsersEmailController(sendActiveUsersEmailUseCase);

  const businessSheetController = new BusinessSheetController(
    createBusinessSheetUseCase,
    editBusinessSheetUseCase,
    getBusinessSheetUseCase,
    shareBusinessSheetUseCase
  );

  const stripeController = new StripeController(createCheckoutSessionUseCase);
  const getAllUsersInfoController = new GetAllUsersInfoController(getAllUsersInfoUseCase);
  const updateUserInfoController = new UpdateUserInfoController(updateUserInfoUseCase);
  const searchUsersController = new SearchUsersController(searchUsersUseCase);
  const webhookController = new WebhookController(stripeService, updateSubscriptionStatusUseCase, updateReferrerNameUseCase);
  const checkSubscriptionStatusController = new CheckSubscriptionStatusController(checkSubscriptionStatusUseCase);

  const chatController = new ChatController(
    createChatUseCase,
    getUserChatsUseCase
  );

  const messageController = new MessageController(
    sendMessageUseCase,
    getMessagesUseCase,
    socketService
  );


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
    chatService: {
      createChatUseCase,
      getUserChatsUseCase,
    },
    messageService: {
      sendMessageUseCase,
      getMessagesUseCase,
    },
    botMessageRepository,
    messageRepository,
    chatRepository,
    blacklistRepository,
    friendRepository,
    suggestedPairRepository,
    virtualChatService,
    sendMessageUseCase,
    virtualUserId,
    adminBotId,
    chatController,
    messageController,
    businessSheetRepository
  };
}