import { Router } from "express";
import  Express  from "express";
import { AdminController } from "../controllers/AdminController";
import { AdminRepository } from "../../infra/repo/AdminRepository";


const router = Router();

export function setupAdminRoutes() {
    const router = Router();
    const adminRepository = new AdminRepository();
    const adminController = new AdminController(adminRepository);
    router.post("/create", (req, res) => adminController.createAdmin(req, res));

    router.post("/login", (req, res) => adminController.adminLogin(req, res));
    return router;
}
export default router;
