import {Admin} from "../../../domain/entities/Admin";
import { IAdminRepository } from "../../../domain/repo/IAdminRepository";
export class AdminUseCase{
    constructor(private adminRepository:IAdminRepository){}

    async createAdmin(adminData:Admin):Promise<Admin>{
        return await this.adminRepository.create(adminData); 
    }
    async loginAdmin (email:string,password:string):Promise<Admin|null>{
        return await this.adminRepository.login(email,password);
    }
}