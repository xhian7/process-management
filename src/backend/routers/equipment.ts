import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";

// Equipment router for CRUD operations
export const equipmentRouter = new Elysia({ prefix: "/equipment" })
  // Create new equipment (without parent class)
  .post(
    "/",
    async ({ body, set }) => {
      try {
        const equipment = await prisma.equipment.create({
          data: {
            id: body.id,
            name: body.name,
            description: body.description,
            isClass: body.isClass ?? false,
            // Note: class field is intentionally omitted (no parent class)
          },
          include: {
            equipmentParameters: true,
          },
        });

        set.status = 201;
        return {
          success: true,
          data: equipment,
        };
      } catch (error) {
        set.status = 400;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create equipment",
        };
      }
    },
    {
      body: t.Object({
        id: t.String({ minLength: 1, maxLength: 50 }),
        name: t.String({ minLength: 1, maxLength: 255 }),
        description: t.Optional(t.String()),
        isClass: t.Optional(t.Boolean()),
      }),
    }
  )

  // Get all equipment
  .get("/", async ({ query }) => {
    try {
      const { includeParameters, includeChildren } = query;

      const equipment = await prisma.equipment.findMany({
        include: {
          equipmentParameters: includeParameters === "true",
          childEquipment: includeChildren === "true",
          parentClass: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return {
        success: true,
        data: equipment,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch equipment",
      };
    }
  }, {
    query: t.Object({
      includeParameters: t.Optional(t.String()),
      includeChildren: t.Optional(t.String()),
    }),
  })

  // Get equipment by ID
  .get(
    "/:id",
    async ({ params, set }) => {
      try {
        const equipment = await prisma.equipment.findUnique({
          where: {
            id: params.id,
          },
          include: {
            equipmentParameters: true,
            childEquipment: true,
            parentClass: true,
            phaseEquipments: {
              include: {
                phase: true,
              },
            },
          },
        });

        if (!equipment) {
          set.status = 404;
          return {
            success: false,
            error: "Equipment not found",
          };
        }

        return {
          success: true,
          data: equipment,
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch equipment",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // Update equipment
  .put(
    "/:id",
    async ({ params, body, set }) => {
      try {
        // Check if equipment exists
        const existing = await prisma.equipment.findUnique({
          where: { id: params.id },
        });

        if (!existing) {
          set.status = 404;
          return {
            success: false,
            error: "Equipment not found",
          };
        }

        const equipment = await prisma.equipment.update({
          where: {
            id: params.id,
          },
          data: {
            name: body.name,
            description: body.description,
            isClass: body.isClass,
            // Note: class field is intentionally omitted (no parent class updates for now)
          },
          include: {
            equipmentParameters: true,
            parentClass: true,
          },
        });

        return {
          success: true,
          data: equipment,
        };
      } catch (error) {
        set.status = 400;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update equipment",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        description: t.Optional(t.String()),
        isClass: t.Optional(t.Boolean()),
      }),
    }
  )

  // Delete equipment
  .delete(
    "/:id",
    async ({ params, set }) => {
      try {
        // Check if equipment exists
        const existing = await prisma.equipment.findUnique({
          where: { id: params.id },
          include: {
            childEquipment: true,
            equipmentParameters: true,
          },
        });

        if (!existing) {
          set.status = 404;
          return {
            success: false,
            error: "Equipment not found",
          };
        }

        // Check if equipment has child equipment
        if (existing.childEquipment.length > 0) {
          set.status = 400;
          return {
            success: false,
            error: "Cannot delete equipment with child equipment",
          };
        }

        // Check if equipment has parameters
        if (existing.equipmentParameters.length > 0) {
          set.status = 400;
          return {
            success: false,
            error: "Cannot delete equipment with associated parameters",
          };
        }

        await prisma.equipment.delete({
          where: {
            id: params.id,
          },
        });

        return {
          success: true,
          message: "Equipment deleted successfully",
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to delete equipment",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
