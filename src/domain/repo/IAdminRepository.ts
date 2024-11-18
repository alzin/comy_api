import {Admin} from "../entities/Admin";
export interface IAdminRepository{
    create(admin:Admin):Promise<Admin>;
    login(name:string,password:string):Promise<Admin | null>;
}
