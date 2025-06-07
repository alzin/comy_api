import { IUserRepository } from "../../../domain/repo/IUserRepository";

export class UpdateReferrerNameUseCase {
  constructor(private userRepository: IUserRepository) { }

  async execute(session: any): Promise<void> {

    const referrerField = session.custom_fields?.find(
      (field) => field.key === "referrer_name"
    );

    const referrerName = referrerField?.text?.value;

    const user = await this.userRepository.findByStripeCustomerId(
      session.customer,
    );
    if (!user) return;

    const updatedFields = {
      referrerName
    };

    console.log("updatedFields:", updatedFields);


    await this.userRepository.update(user.id!, updatedFields);
  }
}
