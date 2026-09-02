import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import diceRouter from "./dice";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(diceRouter);

export default router;
