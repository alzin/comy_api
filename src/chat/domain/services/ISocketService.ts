import { Message } from '../entities/Message';

export interface ISocketService {
  emitMessage(message: Message): void;
}