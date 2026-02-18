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
  ancestorChain?: Equipment[]; // Full chain of parent classes for inheritance tracing
}

export interface EquipmentParameter {
  id: number;
  equipmentId: string;
  name: string;
  description: string | null;
  type: string;
  valueDefinition: any;
  uom: string;
  _inheritedFrom?: string; // ID of the class this parameter was inherited from
  _inheritedFromName?: string; // Name of the class this parameter was inherited from
}

export interface InheritedParameterGroup {
  classId: string;
  className: string;
  parameters: EquipmentParameter[];
}

export interface CreateEquipmentData {
  id: string;
  name: string;
  description?: string;
  class?: string;
  isClass?: boolean;
}

export interface UpdateEquipmentData {
  name: string;
  description?: string;
  class?: string;
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

  // Get all inherited parameters for an equipment (from full hierarchy)
  async getInheritedParameters(id: string): Promise<InheritedParameterGroup[]> {
    const response = await fetch(`${API_BASE}/equipment/${id}/inherited-parameters`);
    const result: ApiResponse<InheritedParameterGroup[]> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch inherited parameters');
    }
    
    return result.data;
  },

  // Get all parameters from a class and its ancestors (for form preview when selecting a class)
  async getClassParameters(classId: string): Promise<InheritedParameterGroup[]> {
    const response = await fetch(`${API_BASE}/equipment/class/${classId}/all-parameters`);
    const result: ApiResponse<InheritedParameterGroup[]> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch class parameters');
    }
    
    return result.data;
  },
};
