// API service for recipe (Group type=RECIPE) operations
import type { ProcedureLogic } from '../components/recipes/workflow/types';

export interface Recipe {
  id: string;
  name: string;
  description: string | null;
  type: 'RECIPE';
  targetExecutionTime: string;
  baseQuantity: string | null;
  uom: string | null;
  procedureLogic: ProcedureLogic | null;
  isbuildingBlock: boolean;
}

export interface CreateRecipeData {
  id: string;
  name: string;
  description?: string;
  type: 'RECIPE';
}

export interface UpdateRecipeData {
  name?: string;
  description?: string | null;
  procedureLogic?: ProcedureLogic | null;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const API_BASE = '/api';

export const recipeApi = {
  // Get all recipes (groups of type RECIPE)
  async getAll(): Promise<Recipe[]> {
    const response = await fetch(`${API_BASE}/group?type=RECIPE`);
    const result: ApiResponse<Recipe[]> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch recipes');
    }

    return result.data;
  },

  // Get recipe by ID
  async getById(id: string): Promise<Recipe> {
    const response = await fetch(`${API_BASE}/group/${id}`);
    const result: ApiResponse<Recipe> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Recipe not found');
    }

    return result.data;
  },

  // Create new recipe
  async create(data: CreateRecipeData): Promise<Recipe> {
    const response = await fetch(`${API_BASE}/group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result: ApiResponse<Recipe> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create recipe');
    }

    return result.data;
  },

  // Update existing recipe
  async update(id: string, data: UpdateRecipeData): Promise<Recipe> {
    const response = await fetch(`${API_BASE}/group/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result: ApiResponse<Recipe> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update recipe');
    }

    return result.data;
  },

  // Delete recipe
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/group/${id}`, {
      method: 'DELETE',
    });

    const result: ApiResponse<void> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete recipe');
    }
  },
};
