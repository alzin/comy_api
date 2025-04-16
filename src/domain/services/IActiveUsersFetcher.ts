//src/domain/services/IActiveUsersFetcher.ts
export interface ActiveUser {
    email: string;
    name?: string;  
  }
  
  export interface ActiveUsersFetcherContract {
    getActiveUsers(): Promise<ActiveUser[]>;
  }
  