import { IRandomStringGenerator } from "../../domain/services/IRandomStrGeneratorService";
import crypto from "crypto";

export class CryptoRandomStringGenerator implements IRandomStringGenerator {
  generate(length: number): string {
    return crypto.randomBytes(length).toString("hex");
  }
}
