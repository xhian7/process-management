import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";
import { GroupType } from "../../../generated/prisma/enums";

// Valid GroupType enum values
const GROUP_TYPES = ["RECIPE", "PROCEDURE", "UNIT_PROCEDURE", "OPERATION"] as const;

// Group router for CRUD operations
export const groupRouter = new Elysia({ prefix: "/group" })
  // Create new group
  .post(
    "/",
    async ({ body, set }) => {
      try {
        const createData = {
          id: body.id,
          name: body.name,
          description: body.description,
          type: body.type as GroupType,
          baseQuantity: body.baseQuantity ?? null,
          uom: body.uom ?? null,
          procedureLogic: body.procedureLogic ?? undefined,
          isbuildingBlock: body.isbuildingBlock ?? false,
          ...(body.targetExecutionTime !== undefined && {
            targetExecutionTime: BigInt(body.targetExecutionTime),
          }),
        };

        const group = await prisma.group.create({ data: createData as any });

        set.status = 201;
        return {
          success: true,
          data: {
            ...group,
            targetExecutionTime: group.targetExecutionTime.toString(),
          },
        };
      } catch (error) {
        set.status = 400;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create group",
        };
      }
    },
    {
      body: t.Object({
        id: t.String({ minLength: 1, maxLength: 50 }),
        name: t.String({ minLength: 1, maxLength: 255 }),
        description: t.Optional(t.String()),
        type: t.Union(GROUP_TYPES.map((v) => t.Literal(v)) as any),
        targetExecutionTime: t.Optional(t.Number({ minimum: 0 })), // defaults to 0
        baseQuantity: t.Optional(t.Nullable(t.Number({ minimum: 0 }))),
        uom: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 20 }))),
        procedureLogic: t.Optional(t.Any()),
        isbuildingBlock: t.Optional(t.Boolean()),
      }),
    }
  )

  // Get all groups
  .get(
    "/",
    async ({ query, set }) => {
      try {
        const where =
          query.type
            ? { type: query.type as GroupType }
            : undefined;

        const groups = await prisma.group.findMany({
          where,
          orderBy: { name: "asc" },
        });

        return {
          success: true,
          data: groups.map((g) => ({
            ...g,
            targetExecutionTime: g.targetExecutionTime.toString(),
          })),
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch groups",
        };
      }
    },
    {
      query: t.Object({
        type: t.Optional(
          t.Union(GROUP_TYPES.map((v) => t.Literal(v)) as any)
        ),
      }),
    }
  )

  // Get group by ID
  .get(
    "/:id",
    async ({ params, set }) => {
      try {
        const group = await prisma.group.findUnique({
          where: { id: params.id },
          include: {
            groupPhases: { include: { phase: true } },
            childGroups: { include: { childGroup: true } },
            parentGroups: { include: { parentGroup: true } },
          },
        });

        if (!group) {
          set.status = 404;
          return {
            success: false,
            error: "Group not found",
          };
        }

        return {
          success: true,
          data: {
            ...group,
            targetExecutionTime: group.targetExecutionTime.toString(),
          },
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch group",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // Update group
  .put(
    "/:id",
    async ({ params, body, set }) => {
      try {
        const existing = await prisma.group.findUnique({
          where: { id: params.id },
        });

        if (!existing) {
          set.status = 404;
          return {
            success: false,
            error: "Group not found",
          };
        }

        const group = await prisma.group.update({
          where: { id: params.id },
          data: {
            name: body.name,
            description: body.description,
            type: body.type !== undefined ? (body.type as GroupType) : undefined,
            targetExecutionTime:
              body.targetExecutionTime !== undefined
                ? BigInt(body.targetExecutionTime)
                : undefined,
            baseQuantity: body.baseQuantity,
            uom: body.uom,
            procedureLogic: body.procedureLogic ?? undefined,
            isbuildingBlock: body.isbuildingBlock,
          },
        });

        return {
          success: true,
          data: {
            ...group,
            targetExecutionTime: group.targetExecutionTime.toString(),
          },
        };
      } catch (error) {
        set.status = 400;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update group",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
        description: t.Optional(t.String()),
        type: t.Optional(
          t.Union(GROUP_TYPES.map((v) => t.Literal(v)) as any)
        ),
        targetExecutionTime: t.Optional(t.Number({ minimum: 0 })),
        baseQuantity: t.Optional(t.Nullable(t.Number({ minimum: 0 }))),
        uom: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 20 }))),
        procedureLogic: t.Optional(t.Any()),
        isbuildingBlock: t.Optional(t.Boolean()),
      }),
    }
  )

  // Delete group
  .delete(
    "/:id",
    async ({ params, set }) => {
      try {
        const existing = await prisma.group.findUnique({
          where: { id: params.id },
        });

        if (!existing) {
          set.status = 404;
          return {
            success: false,
            error: "Group not found",
          };
        }

        await prisma.group.delete({
          where: { id: params.id },
        });

        return {
          success: true,
          data: { id: params.id },
        };
      } catch (error) {
        set.status = 400;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to delete group",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
