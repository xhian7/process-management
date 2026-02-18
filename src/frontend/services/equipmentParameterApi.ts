// API service for equipment parameter operations

export interface EquipmentParameter {
  id: number;
  equipmentId: string;
  name: string;
  description: string | null;
  type: string;
  valueDefinition: any;
  uom: string;
}

export interface CreateParameterData {
  name: string;
  description?: string;
  type: string;
  valueDefinition?: any;
  uom: string;
}

export interface UpdateParameterData {
  name: string;
  description?: string;
  type: string;
  valueDefinition?: any;
  uom: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const API_BASE = '/api';

export const equipmentParameterApi = {
  // Get all parameters for an equipment
  async getAll(equipmentId: string): Promise<EquipmentParameter[]> {
    const response = await fetch(`${API_BASE}/equipment/${equipmentId}/parameters`);
    const result: ApiResponse<EquipmentParameter[]> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch parameters');
    }
    
    return result.data;
  },

  // Get parameter by ID
  async getById(equipmentId: string, parameterId: number): Promise<EquipmentParameter> {
    const response = await fetch(`${API_BASE}/equipment/${equipmentId}/parameters/${parameterId}`);
    const result: ApiResponse<EquipmentParameter> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Parameter not found');
    }
    
    return result.data;
  },

  // Create new parameter
  async create(equipmentId: string, data: CreateParameterData): Promise<EquipmentParameter> {
    const response = await fetch(`${API_BASE}/equipment/${equipmentId}/parameters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result: ApiResponse<EquipmentParameter> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create parameter');
    }
    
    return result.data;
  },

  // Update parameter
  async update(
    equipmentId: string,
    parameterId: number,
    data: UpdateParameterData
  ): Promise<EquipmentParameter> {
    const response = await fetch(
      `${API_BASE}/equipment/${equipmentId}/parameters/${parameterId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );
    
    const result: ApiResponse<EquipmentParameter> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update parameter');
    }
    
    return result.data;
  },

  // Delete parameter
  async delete(equipmentId: string, parameterId: number): Promise<void> {
    const response = await fetch(
      `${API_BASE}/equipment/${equipmentId}/parameters/${parameterId}`,
      {
        method: 'DELETE',
      }
    );
    
    const result: ApiResponse<void> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete parameter');
    }
  },
};
