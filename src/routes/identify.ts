import { Router } from "express";
import { processIdentify } from "../controllers/identify.controller";

const router = Router();

// POST /identify — the only endpoint required to be build in given task.
router.post("/", processIdentify);

export default router;
