import { Router } from "express";
import { container } from "../inversify.config";
import { AuthCredentialController } from "../controllers/authCredential";
import { TYPES } from "../core/types";

const router = Router();
const authCredentialController = container.get<AuthCredentialController>(
  TYPES.AuthCredentialController
);

// 授权信息管理
router.get("/", (req, res) => authCredentialController.getAll(req, res));

router.get("/:id", (req, res) => authCredentialController.getById(req, res));

router.post("/", (req, res) => authCredentialController.create(req, res));

router.put("/:id", (req, res) => authCredentialController.update(req, res));

//
router.delete("/:id", (req, res) => authCredentialController.delete(req, res));

export default router;
