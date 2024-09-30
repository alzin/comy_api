// src/domain/services/IStripeGateway.ts

export interface IStripeGateway {
  createCustomer(email: string, name: string): Promise<string>;
  createCheckoutSession(
    customerId: string,
    priceId: string,
  ): Promise<{ id: string }>;
}
