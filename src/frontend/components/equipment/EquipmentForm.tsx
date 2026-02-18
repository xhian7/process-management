import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Edit, Trash2, Settings } from 'lucide-react';
import { equipmentApi, type CreateEquipmentData, type UpdateEquipmentData } from '../../services/equipmentApi';
import { equipmentParameterApi, type EquipmentParameter, type CreateParameterData, type UpdateParameterData } from '../../services/equipmentParameterApi';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ParameterForm } from './ParameterForm';

// Local parameter type for parameters that haven't been saved yet
type LocalParameter = Omit<CreateParameterData, 'equipmentId'> & { 
  tempId?: string; 
  id?: number;
  _deleted?: boolean; // Mark for deletion
  _modified?: boolean; // Mark as modified
};

export function EquipmentForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = id !== 'new' && Boolean(id);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    isClass: false,
  });

  const [originalParameters, setOriginalParameters] = useState<EquipmentParameter[]>([]);
  const [parameters, setParameters] = useState<LocalParameter[]>([]);
  const [showParameterForm, setShowParameterForm] = useState(false);
  const [editingParameter, setEditingParameter] = useState<LocalParameter | undefined>();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  // Filter out deleted parameters for display
  const visibleParameters = parameters.filter(p => !p._deleted);

  // Check if there are unsaved changes
  const getChangesSummary = () => {
    if (!isEditing) return null;
    
    const newParams = parameters.filter(p => !p.id && !p._deleted).length;
    const modifiedParams = parameters.filter(p => p._modified).length;
    const deletedParams = parameters.filter(p => p._deleted).length;
    const totalChanges = newParams + modifiedParams + deletedParams;
    
    if (totalChanges === 0) return null;
    
    const parts: string[] = [];
    if (newParams > 0) parts.push(`${newParams} new`);
    if (modifiedParams > 0) parts.push(`${modifiedParams} modified`);
    if (deletedParams > 0) parts.push(`${deletedParams} deleted`);
    
    return `${totalChanges} parameter change${totalChanges > 1 ? 's' : ''}: ${parts.join(', ')}`;
  };

  const hasChanges = () => {
    return getChangesSummary() !== null;
  };

  useEffect(() => {
    if (isEditing && id) {
      loadEquipment(id);
    }
  }, [id, isEditing]);

  const loadEquipment = async (equipmentId: string) => {
    try {
      setLoadingData(true);
      const data = await equipmentApi.getById(equipmentId);
      setFormData({
        id: data.id,
        name: data.name,
        description: data.description || '',
        isClass: data.isClass,
      });
      // Load parameters for editing mode
      await loadParameters(equipmentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load equipment');
    } finally {
      setLoadingData(false);
    }
  };

  const loadParameters = async (equipmentId: string) => {
    try {
      const data = await equipmentParameterApi.getAll(equipmentId);
      setOriginalParameters(data);
      // Convert to local parameters for editing
      const localParams: LocalParameter[] = data.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        type: p.type,
        valueDefinition: p.valueDefinition,
        uom: p.uom,
      }));
      setParameters(localParams);
    } catch (err) {
      console.error('Failed to load parameters:', err);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    // Validate required fields
    if (!formData.id && !isEditing) {
      setError('Equipment ID is required');
      return;
    }
    if (!formData.name) {
      setError('Equipment Name is required');
      return;
    }

    try {
      setLoading(true);

      if (isEditing && id) {
        // Update existing equipment
        const updateData: UpdateEquipmentData = {
          name: formData.name,
          description: formData.description || undefined,
          isClass: formData.isClass,
        };
        await equipmentApi.update(id, updateData);

        // Process parameter changes
        const promises: Promise<any>[] = [];
        
        // Delete marked parameters
        parameters.filter(p => p._deleted && p.id).forEach(p => {
          promises.push(equipmentParameterApi.delete(id, p.id!));
        });

        // Update modified parameters
        parameters.filter(p => !p._deleted && p.id && p._modified).forEach(p => {
          promises.push(equipmentParameterApi.update(id, p.id!, {
            name: p.name,
            description: p.description,
            type: p.type,
            valueDefinition: p.valueDefinition,
            uom: p.uom,
          }));
        });

        // Create new parameters (those without id)
        parameters.filter(p => !p._deleted && !p.id).forEach(p => {
          promises.push(equipmentParameterApi.create(id, {
            name: p.name,
            description: p.description,
            type: p.type,
            valueDefinition: p.valueDefinition,
            uom: p.uom,
          }));
        });

        await Promise.all(promises);
        navigate('/app/equipments');
      } else {
        // Create new equipment
        const createData: CreateEquipmentData = {
          id: formData.id,
          name: formData.name,
          description: formData.description || undefined,
          isClass: formData.isClass,
        };
        await equipmentApi.create(createData);

        // Create all parameters (excluding deleted ones)
        const parameterPromises = parameters
          .filter(p => !p._deleted)
          .map(param => 
            equipmentParameterApi.create(formData.id, {
              name: param.name,
              description: param.description,
              type: param.type,
              valueDefinition: param.valueDefinition,
              uom: param.uom,
            })
          );
        
        if (parameterPromises.length > 0) {
          await Promise.all(parameterPromises);
        }

        navigate('/app/equipments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleAddParameter = () => {
    setEditingParameter(undefined);
    setShowParameterForm(true);
  };

  const handleEditParameter = (parameter: LocalParameter) => {
    setEditingParameter(parameter);
    setShowParameterForm(true);
  };

  const handleDeleteParameter = (parameterId: number | string) => {
    if (!confirm('Are you sure you want to delete this parameter?')) {
      return;
    }

    if (typeof parameterId === 'number') {
      // Mark existing parameter for deletion
      setParameters(prev =>
        prev.map(p => p.id === parameterId ? { ...p, _deleted: true } : p)
      );
    } else {
      // Remove new parameter completely
      setParameters(prev => prev.filter(p => p.tempId !== parameterId));
    }
  };

  const handleParameterFormSuccess = (parameterData?: CreateParameterData) => {
    if (parameterData) {
      if (editingParameter?.tempId) {
        // Update existing local parameter (new, not saved)
        setParameters(prev =>
          prev.map(p =>
            p.tempId === editingParameter.tempId
              ? { ...parameterData, tempId: editingParameter.tempId }
              : p
          )
        );
      } else if (editingParameter?.id) {
        // Update existing saved parameter
        setParameters(prev =>
          prev.map(p =>
            p.id === editingParameter.id
              ? { ...parameterData, id: editingParameter.id, _modified: true }
              : p
          )
        );
      } else {
        // Add new local parameter
        const newParam: LocalParameter = {
          ...parameterData,
          tempId: `temp-${Date.now()}-${Math.random()}`,
        };
        setParameters(prev => [...prev, newParam]);
      }
    }

    setShowParameterForm(false);
    setEditingParameter(undefined);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleBack = () => {
    if (hasChanges() && isEditing) {
      if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    navigate('/app/equipments');
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading equipment...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={handleBack}
            className="gap-2 mb-4"
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Equipment
          </Button>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-semibold text-foreground mb-2">
                {isEditing ? formData.name || 'Edit Equipment' : 'New Equipment'}
              </h1>
              {isEditing ? (
                <p className="text-muted-foreground">
                  {getChangesSummary() || 'No pending changes'}
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Create a new equipment or equipment class
                </p>
              )}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Equipment'}
            </Button>
          </div>
        </div>

        {/* Error Message at top */}
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 mb-6">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="grid gap-6">
          {/* Equipment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Equipment Details</CardTitle>
              <CardDescription>
                Enter the basic information for the equipment
              </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* ID Field - only for new equipment */}
              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="id">Equipment ID *</Label>
                  <Input
                    id="id"
                    name="id"
                    value={formData.id}
                    onChange={handleChange}
                    placeholder="E.g., TANK-001, PUMP-A1"
                    required
                    maxLength={50}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier for the equipment. Cannot be changed after creation.
                  </p>
                </div>
              )}

              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name">Equipment Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="E.g., Mixing Tank 500L"
                  required
                  maxLength={255}
                  disabled={loading}
                />
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter a detailed description of the equipment..."
                  rows={4}
                  disabled={loading}
                />
              </div>

              {/* Is Class Checkbox */}
              <div className="flex items-start space-x-3 rounded-md border border-border p-4">
                <input
                  type="checkbox"
                  id="isClass"
                  name="isClass"
                  checked={formData.isClass}
                  onChange={handleChange}
                  disabled={loading}
                  className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
                />
                <div className="space-y-1 leading-none">
                  <Label
                    htmlFor="isClass"
                    className="text-sm font-medium cursor-pointer"
                  >
                    This is an equipment class
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Equipment classes can be used as templates for creating multiple equipment instances.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parameters Section - Available in both create and edit modes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Parameters
                </CardTitle>
                <CardDescription>
                  Configuration parameters for this equipment
                </CardDescription>
              </div>
              <Button
                onClick={handleAddParameter}
                disabled={showParameterForm || loading}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Parameter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showParameterForm ? (
              <div className="border rounded-lg p-4">
                <ParameterForm
                  equipmentId={undefined}
                  parameter={editingParameter}
                  onSuccess={handleParameterFormSuccess}
                  onCancel={() => {
                    setShowParameterForm(false);
                    setEditingParameter(undefined);
                  }}
                  inline
                />
              </div>
            ) : visibleParameters.length === 0 ? (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No parameters defined yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleParameters.map((param) => {
                  const paramId = param.id || param.tempId!;
                  const isNew = !param.id; // No ID means it's new
                  const isModified = param._modified && param.id; // Has ID and is modified
                  
                  return (
                    <div
                      key={paramId}
                      className="flex items-start justify-between border border-border rounded-lg p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-foreground">{param.name}</p>
                          <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">
                            {param.type}
                          </span>
                          {isNew && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 rounded">
                              New
                            </span>
                          )}
                          {isModified && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded">
                              Modified
                            </span>
                          )}
                        </div>
                        {param.description && (
                          <p className="text-sm text-muted-foreground mt-1 mb-2">
                            {param.description}
                          </p>
                        )}
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <strong>UOM:</strong> {param.uom}
                          </span>
                          {param.valueDefinition && (
                            <span className="flex items-center gap-1">
                              <strong>Definition:</strong>{' '}
                              {JSON.stringify(param.valueDefinition)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditParameter(param)}
                          disabled={showParameterForm || loading}
                          className="gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteParameter(paramId)}
                          disabled={showParameterForm || loading}
                          className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
