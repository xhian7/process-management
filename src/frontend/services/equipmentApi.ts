// API service for equipment operations

export interface Equipment {
  id: string;
  name: string;
  description: string | null;
  class: string | null;
  isClass: boolean;
  equipmentParameters?: EquipmentParameter[];
  childEquipment?: Equipment[];
  parentClass?: Equipment | null;
}

export interface EquipmentParameter {
  id: number;
  equipmentId: string;
  name: string;
  description: string | null;
  type: string;
  valueDefinition: any;
  uom: string;
}

export interface CreateEquipmentData {
  id: string;
  name: string;
  description?: string;
  isClass?: boolean;
}

export interface UpdateEquipmentData {
  name: string;
  description?: string;
  isClass?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const API_BASE = '/api';

export const equipmentApi = {
  // Get all equipment
  async getAll(includeParameters = false, includeChildren = false): Promise<Equipment[]> {
    const params = new URLSearchParams();
    if (includeParameters) params.append('includeParameters', 'true');
    if (includeChildren) params.append('includeChildren', 'true');
    
    const response = await fetch(`${API_BASE}/equipment?${params}`);
    const result: ApiResponse<Equipment[]> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch equipment');
    }
    
    return result.data;
  },

  // Get equipment by ID
  async getById(id: string): Promise<Equipment> {
    const response = await fetch(`${API_BASE}/equipment/${id}`);
    const result: ApiResponse<Equipment> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Equipment not found');
    }
    
    return result.data;
  },

  // Create new equipment
  async create(data: CreateEquipmentData): Promise<Equipment> {
    const response = await fetch(`${API_BASE}/equipment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result: ApiResponse<Equipment> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create equipment');
    }
    
    return result.data;
  },

  // Update equipment
  async update(id: string, data: UpdateEquipmentData): Promise<Equipment> {
    const response = await fetch(`${API_BASE}/equipment/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result: ApiResponse<Equipment> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update equipment');
    }
    
    return result.data;
  },

  // Delete equipment
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/equipment/${id}`, {
      method: 'DELETE',
    });
    
    const result: ApiResponse<void> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete equipment');
    }
  },
};
