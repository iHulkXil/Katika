import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import diceRouter from "./dice";
import coinflipRouter from "./coinflip";
import minesRouter from "./mines";
import rouletteRouter from "./roulette";

const router: IRouter = Router();
router.use(healthRouter);
router.use(meRouter);
router.use(diceRouter);
router.use(coinflipRouter);
router.use(minesRouter);
router.use(rouletteRouter);
export default router;
