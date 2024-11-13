import { IAdminRepository } from "../../domain/repo/IAdminRepository";
import { Admin } from "../../domain/entities/Admin";
import { AdminModel } from "../database/models/AdminModel";
import bcrypt from "bcryptjs";

export class AdminRepository implements IAdminRepository {
  
  async create(admin: Admin): Promise<Admin> {
    
    const hashedPassword = await bcrypt.hash(admin.password as string, 10);
    const newAdmin = new AdminModel({
      email: admin.email,
      name: admin.name,
      password: hashedPassword,
      IsSuperAdmin: admin.IsSuperAdmin,
    });

    
    await newAdmin.save();
    return newAdmin.toObject(); 
  }

  
  async login(name: string, password: string): Promise<Admin |null> {
    
    const admin = await AdminModel.findOne({ name });
    if (!admin) return null;
    
    const isPasswordValid = await bcrypt.compare(password, admin.password as string);
    if (!isPasswordValid) return null;

    return admin.toObject();
  }
}
