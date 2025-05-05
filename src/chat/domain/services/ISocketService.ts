import { Message } from '../../../chat/domain/entities/Message';

export interface ISocketService {
  emitMessage(message: Message): void;
}