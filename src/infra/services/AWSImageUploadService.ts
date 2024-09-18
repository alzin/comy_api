import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { IImageUploadService } from "../../domain/services/IImageUploadService";
import { CONFIG } from "../../main/config/config";

export class AWSImageUploadService implements IImageUploadService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: "ap-northeast-1",
      credentials: {
        accessKeyId: CONFIG.AWS_ACCESS_KEY_ID,
        secretAccessKey: CONFIG.AWS_SECRET_ACCESS_KEY,
      },
    });

    this.bucketName = CONFIG.AWS_S3_BUCKET_NAME;
  }

  async uploadImage(imageBuffer: Buffer, key: string): Promise<string> {
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucketName,
        Key: key,
        Body: imageBuffer,
        ContentType: "image/jpeg",
        ACL: "public-read",
      },
    });

    const result = await upload.done();

    if (!result.Location) {
      throw new Error("Failed to upload image: Location is undefined");
    }

    return result.Location;
  }

  async deleteImage(key: string): Promise<void> {
    const deleteParams = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    await this.s3Client.send(deleteParams);
  }
}
