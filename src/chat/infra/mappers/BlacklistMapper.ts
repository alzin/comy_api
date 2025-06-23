import { Types } from 'mongoose';

export function toBlacklistDomain(blockedUserId: string): string {
  return blockedUserId;
}