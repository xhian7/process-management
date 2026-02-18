import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";

// Helper function to recursively get all ancestors of a class
async function getAncestorChain(classId: string): Promise<any[]> {
  const ancestors: any[] = [];
  let currentClassId: string | null = classId;
  
  while (currentClassId) {
    const equipment: any = await prisma.equipment.findUnique({
      where: { id: currentClassId },
      include: {
        equipmentParameters: true,
      },
    });
    
    if (!equipment) break;
    
    ancestors.push(equipment);
    currentClassId = equipment.class;
  }
  
  return ancestors;
}

// Helper function to get all inherited parameters from the full hierarchy
async function getAllInheritedParameters(classId: string) {
  const ancestorChain = await getAncestorChain(classId);
  
  // Reverse to go from oldest to newest (root to leaf)
  ancestorChain.reverse();
  
  const groupedByClass: any[] = [];
  const seenParameterNames = new Set<string>();
  
  // Process from oldest ancestor to newest (parent to child)
  for (const ancestor of ancestorChain) {
    const classParameters: any[] = [];
    
    for (const param of ancestor.equipmentParameters) {
      // Only add if we haven't seen this parameter name before
      if (!seenParameterNames.has(param.name)) {
        classParameters.push({
          ...param,
          _inheritedFrom: ancestor.id,
          _inheritedFromName: ancestor.name,
        });
        seenParameterNames.add(param.name);
      }
    }
    
    // Only add if this class has parameters
    if (classParameters.length > 0) {
      groupedByClass.push({
        classId: ancestor.id,
        className: ancestor.name,
        parameters: classParameters,
      });
    }
  }
  
  return groupedByClass;
}

// Equipment router for CRUD operations
export const equipmentRouter = new Elysia({ prefix: "/equipment" })
  // Create new equipment (with optional parent class)
  .post(
    "/",
    async ({ body, set }) => {
      try {
        const equipment = await prisma.equipment.create({
          data: {
            id: body.id,
            name: body.name,
            description: body.description,
            class: body.class, // Parent class reference
            isClass: body.isClass ?? false,
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
        class: t.Optional(t.String({ maxLength: 50 })),
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

        // Get ancestor chain for inheritance traceability
        let ancestorChain: any[] = [];
        if (equipment.class) {
          ancestorChain = await getAncestorChain(equipment.class);
        }

        return {
          success: true,
          data: {
            ...equipment,
            ancestorChain, // Full chain of parent classes
          },
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

  // Get all inherited parameters for an equipment (from full hierarchy)
  .get(
    "/:id/inherited-parameters",
    async ({ params, set }) => {
      try {
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

        if (!equipment.class) {
          return {
            success: true,
            data: [], // No parent class, no inherited parameters
          };
        }

        const inheritedParameters = await getAllInheritedParameters(equipment.class);

        return {
          success: true,
          data: inheritedParameters,
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch inherited parameters",
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // Get all parameters from a class and its ancestors (for form preview)
  .get(
    "/class/:classId/all-parameters",
    async ({ params, set }) => {
      try {
        const classEquipment = await prisma.equipment.findUnique({
          where: { id: params.classId },
        });

        if (!classEquipment) {
          set.status = 404;
          return {
            success: false,
            error: "Class not found",
          };
        }

        // Get parameters from this class and all its ancestors
        const allParameters = await getAllInheritedParameters(params.classId);

        return {
          success: true,
          data: allParameters,
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch class parameters",
        };
      }
    },
    {
      params: t.Object({
        classId: t.String(),
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
            class: body.class,
            isClass: body.isClass,
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
        class: t.Optional(t.String({ maxLength: 50 })),
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
