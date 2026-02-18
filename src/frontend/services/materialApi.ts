// API service for material operations

export interface Material {
  id: string;
  name: string;
  description: string | null;
  uom: string;
}

export interface CreateMaterialData {
  id: string;
  name: string;
  description?: string;
  uom: string;
}

export interface UpdateMaterialData {
  name: string;
  description?: string;
  uom: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const API_BASE = '/api';

export const materialApi = {
  // Get all materials
  async getAll(): Promise<Material[]> {
    const response = await fetch(`${API_BASE}/material`);
    const result: ApiResponse<Material[]> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch materials');
    }
    
    return result.data;
  },

  // Get material by ID
  async getById(id: string): Promise<Material> {
    const response = await fetch(`${API_BASE}/material/${id}`);
    const result: ApiResponse<Material> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Material not found');
    }
    
    return result.data;
  },

  // Create new material
  async create(data: CreateMaterialData): Promise<Material> {
    const response = await fetch(`${API_BASE}/material`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result: ApiResponse<Material> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create material');
    }
    
    return result.data;
  },

  // Update existing material
  async update(id: string, data: UpdateMaterialData): Promise<Material> {
    const response = await fetch(`${API_BASE}/material/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result: ApiResponse<Material> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update material');
    }
    
    return result.data;
  },

  // Delete material
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/material/${id}`, {
      method: 'DELETE',
    });
    
    const result: ApiResponse<void> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete material');
    }
  },
};
