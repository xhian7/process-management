import { Elysia } from "elysia";
import { equipmentRouter } from "./routers/equipment";
import { equipmentParameterRouter } from "./routers/equipmentParameter";

export const api = new Elysia({ prefix: "/api" })
    .use(equipmentRouter)
    .use(equipmentParameterRouter);