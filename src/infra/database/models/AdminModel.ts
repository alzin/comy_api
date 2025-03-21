import { hash, sign } from "crypto";
import mongoose,{Schema,Document,Types, ObjectId, model} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "process";
export interface AdminDocument extends Document<Types.ObjectId> {
  _id: Types.ObjectId;
  email: string;
  name: string;
  password: string;
  accessToken?: string;
  IsSuperAdmin?:string;
  generateAccessToken(): string;
}
const AdminSchema: Schema<AdminDocument> = new Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    accessToken: { type: String },
    IsSuperAdmin: { type: String, required:true},
  },
  { timestamps: true,collection: "admins" }
);
AdminSchema.pre("save", async function (next) {
  const admin = this as AdminDocument;
  if (admin.isModified("password")) {
    const hashedPassword = await bcrypt.hash(admin.password, 10);
    admin.password = hashedPassword;
  }
  next();
});
AdminSchema.methods.generateAccessToken = function () {
  const admin = this;
  const token = jwt.sign(
    { id: admin._id, email: admin.email, name: admin.name,IsSuperAdmin:admin.IsSuperAdmin},
    process.env.JWT_ADMIN_SECRET as string
  );
  return token;
};
export const AdminModel = mongoose.model<AdminDocument>("Admin", AdminSchema);
