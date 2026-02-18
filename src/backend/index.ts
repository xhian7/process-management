import { Elysia } from "elysia";
import { equipmentRouter } from "./routers/equipment";
import { equipmentParameterRouter } from "./routers/equipmentParameter";
import { materialRouter } from "./routers/material";

export const api = new Elysia({ prefix: "/api" })
    .use(equipmentRouter)
    .use(equipmentParameterRouter)
    .use(materialRouter);