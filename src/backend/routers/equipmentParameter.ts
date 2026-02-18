import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";

// Equipment Parameter router for CRUD operations
export const equipmentParameterRouter = new Elysia({ prefix: "/equipment/:id/parameters" })
  // Create new equipment parameter
  .post(
    "/",
    async ({ params, body, set }) => {
      try {
        // Verify equipment exists
        const equipment = await prisma.equipment.findUnique({
          where: { id: params.id },
        });

        if (!equipment) {
          set.status = 404;
          return {
            success: false,
            error: "Equipment not found",
          };
        }

        const parameter = await prisma.equipmentParameter.create({
          data: {
            equipmentId: params.id,
            name: body.name,
            description: body.description,
            type: body.type,
            valueDefinition: body.valueDefinition,
            uom: body.uom,
          },
        });

        set.status = 201;
        return {
          success: true,
          data: parameter,
        };
      } catch (error) {
        set.status = 400;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create parameter",
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
        type: t.String({ minLength: 1, maxLength: 50 }),
        valueDefinition: t.Optional(t.Any()),
        uom: t.String({ minLength: 1, maxLength: 20 }),
      }),
    }
  )

  // Get all parameters for an equipment
  .get(
    "/",
    async ({ params, set }) => {
      try {
        // Verify equipment exists
        const equipment = await prisma.equipment.findUnique({
          where: { id: params.id },
        });

        if (!equipment) {
          set.status = 404;
          return {
            success: false,
            error: "Equipment not found",
          };
        }

        const parameters = await prisma.equipmentParameter.findMany({
          where: {
            equipmentId: params.id,
          },
          orderBy: {
            name: "asc",
          },
        });

        return {
          success: true,
          data: parameters,
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch parameters",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // Get parameter by ID
  .get(
    "/:parameterId",
    async ({ params, set }) => {
      try {
        const parameter = await prisma.equipmentParameter.findUnique({
          where: {
            id: parseInt(params.parameterId),
          },
          include: {
            equipment: true,
          },
        });

        if (!parameter) {
          set.status = 404;
          return {
            success: false,
            error: "Parameter not found",
          };
        }

        // Verify parameter belongs to the specified equipment
        if (parameter.equipmentId !== params.id) {
          set.status = 404;
          return {
            success: false,
            error: "Parameter not found for this equipment",
          };
        }

        return {
          success: true,
          data: parameter,
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch parameter",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
        parameterId: t.String(),
      }),
    }
  )

  // Update parameter
  .put(
    "/:parameterId",
    async ({ params, body, set }) => {
      try {
        // Check if parameter exists and belongs to equipment
        const existing = await prisma.equipmentParameter.findUnique({
          where: { id: parseInt(params.parameterId) },
        });

        if (!existing) {
          set.status = 404;
          return {
            success: false,
            error: "Parameter not found",
          };
        }

        if (existing.equipmentId !== params.id) {
          set.status = 404;
          return {
            success: false,
            error: "Parameter not found for this equipment",
          };
        }

        const parameter = await prisma.equipmentParameter.update({
          where: {
            id: parseInt(params.parameterId),
          },
          data: {
            name: body.name,
            description: body.description,
            type: body.type,
            valueDefinition: body.valueDefinition,
            uom: body.uom,
          },
        });

        return {
          success: true,
          data: parameter,
        };
      } catch (error) {
        set.status = 400;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update parameter",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
        parameterId: t.String(),
      }),
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        description: t.Optional(t.String()),
        type: t.String({ minLength: 1, maxLength: 50 }),
        valueDefinition: t.Optional(t.Any()),
        uom: t.String({ minLength: 1, maxLength: 20 }),
      }),
    }
  )

  // Delete parameter
  .delete(
    "/:parameterId",
    async ({ params, set }) => {
      try {
        // Check if parameter exists and belongs to equipment
        const existing = await prisma.equipmentParameter.findUnique({
          where: { id: parseInt(params.parameterId) },
          include: {
            phaseEquipmentParameters: true,
          },
        });

        if (!existing) {
          set.status = 404;
          return {
            success: false,
            error: "Parameter not found",
          };
        }

        if (existing.equipmentId !== params.id) {
          set.status = 404;
          return {
            success: false,
            error: "Parameter not found for this equipment",
          };
        }

        // Check if parameter is being used in phases
        if (existing.phaseEquipmentParameters.length > 0) {
          set.status = 400;
          return {
            success: false,
            error: "Cannot delete parameter that is being used in phases",
          };
        }

        await prisma.equipmentParameter.delete({
          where: {
            id: parseInt(params.parameterId),
          },
        });

        return {
          success: true,
          message: "Parameter deleted successfully",
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to delete parameter",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
        parameterId: t.String(),
      }),
    }
  );
