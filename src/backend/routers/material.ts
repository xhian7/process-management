import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";

// Material router for CRUD operations
export const materialRouter = new Elysia({ prefix: "/material" })
  // Create new material
  .post(
    "/",
    async ({ body, set }) => {
      try {
        const material = await prisma.material.create({
          data: {
            id: body.id,
            name: body.name,
            description: body.description,
            uom: body.uom,
          },
        });

        set.status = 201;
        return {
          success: true,
          data: material,
        };
      } catch (error) {
        set.status = 400;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create material",
        };
      }
    },
    {
      body: t.Object({
        id: t.String({ minLength: 1, maxLength: 50 }),
        name: t.String({ minLength: 1, maxLength: 255 }),
        description: t.Optional(t.String()),
        uom: t.String({ minLength: 1, maxLength: 20 }),
      }),
    }
  )

  // Get all materials
  .get("/", async ({ query, set }) => {
    try {
      const materials = await prisma.material.findMany({
        orderBy: {
          name: 'asc',
        },
      });

      return {
        success: true,
        data: materials,
      };
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch materials",
      };
    }
  })

  // Get material by ID
  .get(
    "/:id",
    async ({ params, set }) => {
      try {
        const material = await prisma.material.findUnique({
          where: { id: params.id },
        });

        if (!material) {
          set.status = 404;
          return {
            success: false,
            error: "Material not found",
          };
        }

        return {
          success: true,
          data: material,
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch material",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // Update material
  .put(
    "/:id",
    async ({ params, body, set }) => {
      try {
        const material = await prisma.material.update({
          where: { id: params.id },
          data: {
            name: body.name,
            description: body.description,
            uom: body.uom,
          },
        });

        return {
          success: true,
          data: material,
        };
      } catch (error) {
        set.status = 400;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update material",
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
        uom: t.String({ minLength: 1, maxLength: 20 }),
      }),
    }
  )

  // Delete material
  .delete(
    "/:id",
    async ({ params, set }) => {
      try {
        await prisma.material.delete({
          where: { id: params.id },
        });

        return {
          success: true,
          message: "Material deleted successfully",
        };
      } catch (error) {
        set.status = 400;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to delete material",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
