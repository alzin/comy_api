import { json, Request,response,Response } from "express";
import {IAdminRepository} from "../../domain/repo/IAdminRepository";
import {Admin} from "../../domain/entities/Admin";
import { create } from "domain";
import { AdminDocument, AdminModel } from "../../infra/database/models/AdminModel";

export class AdminController{

    constructor (private adminRepository :IAdminRepository){}

     async createAdmin(req:Request,res:Response):Promise<Response>{
        const {email,name,password,IsSuperAdmin}= req.body;
        try {
            const currentAdmin = await AdminModel.findById(req.adminId);
            if (!currentAdmin || currentAdmin.IsSuperAdmin !== "yes") {
            return res.status(403).json({ message: "Unauthorized: Only Super Admin can create new admins" });
            }
            const newAdminData: Partial<AdminDocument> = { email, name, password, IsSuperAdmin };
            const createdAdmin = await AdminModel.create(newAdminData);
            const token = createdAdmin.generateAccessToken();
            createdAdmin.accessToken = token;
            await createdAdmin.save();

            return res.status(201).json({ message: "Admin Created Successfully", Admin: createdAdmin });
        }
        catch (error) {
            return res.status(500).json({ message: "Error creating admin", error });
        }

    }

    async adminLogin(req:Request,res:Response):Promise<Response>{
        const {name,password}=req.body;
        try{
             const admin =await this.adminRepository.login(name,password);
            if(admin ===null)
                return res.status(401).json({message:"Invalid credentials"}) ;
            return res.status(200).json({message:"Login successful",admin});
        }
        catch(error){
            return res.status(500).json({message:"cannot loggin in ",error});
        }
    }
}
