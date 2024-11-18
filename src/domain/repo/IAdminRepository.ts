import {Admin} from "../entities/Admin";
export interface IAdminRepository{
    create(admin:Admin):Promise<Admin>;
    login(email:string,password:string):Promise<Admin | null>;
}