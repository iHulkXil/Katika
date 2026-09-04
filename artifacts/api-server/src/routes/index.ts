import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import diceRouter from "./dice";
import coinflipRouter from "./coinflip";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(diceRouter);
router.use(coinflipRouter);

export default router;
