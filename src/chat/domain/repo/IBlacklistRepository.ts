export interface IBlacklistRepository {
    addToBlacklist(userId: string, blacklistedUserId: string): Promise<void>;
    getBlacklistedUsers(userId: string): Promise<string[]>;
    isBlacklisted(userId: string, blacklistedUserId: string): Promise<boolean>;
  }