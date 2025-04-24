import { Server } from 'socket.io';
import { SocketIOService } from '../../infra/services/SocketIOService';

export const setupSocketHandlers = (io: Server, socketService: SocketIOService) => {
  socketService.initialize();
};