///src/chat/presentation/socket/socketManager.ts
import { Server } from 'socket.io';

// Set up Socket.IO handlers
export function setupSocketHandlers(io: Server, dependencies: any): void {
  dependencies.socketService.initialize();
}