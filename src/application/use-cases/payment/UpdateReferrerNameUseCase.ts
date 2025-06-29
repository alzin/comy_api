import Stripe from "stripe";
import { IUserRepository } from "../../../domain/repo/IUserRepository";

interface CustomField {
  key: string;
  text?: {
    value?: string;
  };
}

export class UpdateReferrerNameUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(session: Stripe.Checkout.Session): Promise<void> {
    const referrerField = (session.custom_fields as CustomField[] | undefined)?.find(
      (field) => field.key === "referrer_name"
    );

    const referrerName = referrerField?.text?.value;

    const customerId = typeof session.customer === "string" ? session.customer : null;
    if (!customerId) return;

    const user = await this.userRepository.findByStripeCustomerId(customerId);
    if (!user) return;

    const updatedFields = {
      referrerName,
    };

    console.log("updatedFields:", updatedFields);

    await this.userRepository.update(user.id!, updatedFields);
  }
}
