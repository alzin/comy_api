// src/domain/services/IStripeGateway.ts

export interface IStripeGateway {
    createCustomer(email: string, name: string): Promise<string>;
    createCheckoutSession(customerId: string): Promise<{ id: string }>;
}