import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Edit, Trash2, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import { equipmentApi, type CreateEquipmentData, type UpdateEquipmentData, type Equipment, type InheritedParameterGroup } from '../../services/equipmentApi';
import { equipmentParameterApi, type EquipmentParameter, type CreateParameterData, type UpdateParameterData } from '../../services/equipmentParameterApi';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ParameterForm } from './ParameterForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

// Helper function to render value definition badges
const renderValueDefinitionBadges = (valueDefinition: any, type: string) => {
  if (!valueDefinition) return null;

  if (valueDefinition.type === 'range') {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {valueDefinition.min !== undefined && (
          <span className="text-xs px-1.5 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded border border-blue-500/20">
            min: {valueDefinition.min}
          </span>
        )}
        {valueDefinition.max !== undefined && (
          <span className="text-xs px-1.5 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded border border-blue-500/20">
            max: {valueDefinition.max}
          </span>
        )}
        {valueDefinition.default !== undefined && (
          <span className="text-xs px-1.5 py-0.5 bg-green-500/10 text-green-700 dark:text-green-400 rounded border border-green-500/20">
            default: {valueDefinition.default}
          </span>
        )}
      </div>
    );
  } else if (valueDefinition.type === 'select') {
    const optionsCount = Array.isArray(valueDefinition.options) ? valueDefinition.options.length : 0;
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs px-1.5 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded border border-purple-500/20">
          {optionsCount} option{optionsCount !== 1 ? 's' : ''}
        </span>
      </div>
    );
  } else if (valueDefinition.type === 'static' && valueDefinition.default !== undefined) {
    const displayValue = typeof valueDefinition.default === 'boolean' 
      ? (valueDefinition.default ? 'true' : 'false')
      : String(valueDefinition.default);
    
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs px-1.5 py-0.5 bg-green-500/10 text-green-700 dark:text-green-400 rounded border border-green-500/20">
          default: {displayValue}
        </span>
      </div>
    );
  }

  return null;
};

// Local parameter type for parameters that haven't been saved yet
type LocalParameter = Omit<CreateParameterData, 'equipmentId'> & { 
  tempId?: string; 
  id?: number;
  _deleted?: boolean; // Mark for deletion
  _modified?: boolean; // Mark as modified
  _inherited?: boolean; // Mark as inherited from parent class (read-only)
  _inheritedFrom?: string; // ID of the class this parameter was inherited from
  _inheritedFromName?: string; // Name of the class this parameter was inherited from
};

export function EquipmentForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = id !== 'new' && Boolean(id);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    class: '',
    isClass: false,
  });

  const [availableClasses, setAvailableClasses] = useState<Equipment[]>([]);
  const [inheritedParameterGroups, setInheritedParameterGroups] = useState<InheritedParameterGroup[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [originalParameters, setOriginalParameters] = useState<EquipmentParameter[]>([]);
  const [parameters, setParameters] = useState<LocalParameter[]>([]);
  const [showParameterForm, setShowParameterForm] = useState(false);
  const [editingParameter, setEditingParameter] = useState<LocalParameter | undefined>();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Dialog state
  const [pendingDeleteParamId, setPendingDeleteParamId] = useState<number | string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  // Flatten inherited parameters for compatibility
  const inheritedParameters: LocalParameter[] = inheritedParameterGroups.flatMap(group =>
    group.parameters.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      type: p.type,
      valueDefinition: p.valueDefinition,
      uom: p.uom,
      _inherited: true,
      _inheritedFrom: group.classId,
      _inheritedFromName: group.className,
    }))
  );

  // Combine inherited and own parameters for display
  const allParameters = [...inheritedParameters, ...parameters.filter(p => !p._deleted)];

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
    loadAvailableClasses();
    if (isEditing && id) {
      loadEquipment(id);
    }
  }, [id, isEditing]);

  // Load inherited parameters when class changes
  useEffect(() => {
    if (formData.class) {
      loadInheritedParameters(formData.class);
    } else {
      setInheritedParameterGroups([]);
    }
  }, [formData.class]);

  const loadAvailableClasses = async () => {
    try {
      setLoadingClasses(true);
      const allEquipment = await equipmentApi.getAll(false, false);
      // Filter to only show equipment marked as classes
      const classes = allEquipment.filter(eq => eq.isClass);
      setAvailableClasses(classes);
    } catch (err) {
      console.error('Failed to load classes:', err);
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadInheritedParameters = async (classId: string) => {
    try {
      // Use the endpoint that gets all parameters from a class and its ancestors
      const groups = await equipmentApi.getClassParameters(classId);
      setInheritedParameterGroups(groups);
    } catch (err) {
      console.error('Failed to load inherited parameters:', err);
      setInheritedParameterGroups([]);
    }
  };

  const toggleGroupCollapse = (classId: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  };

  const loadEquipment = async (equipmentId: string) => {
    try {
      setLoadingData(true);
      const data = await equipmentApi.getById(equipmentId);
      setFormData({
        id: data.id,
        name: data.name,
        description: data.description || '',
        class: data.class || '',
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
          class: formData.class || undefined,
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
          class: formData.class || undefined,
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
    setPendingDeleteParamId(parameterId);
  };

  const confirmDeleteParameter = () => {
    if (pendingDeleteParamId === null) return;
    const parameterId = pendingDeleteParamId;
    setPendingDeleteParamId(null);
    if (typeof parameterId === 'number') {
      setParameters(prev =>
        prev.map(p => p.id === parameterId ? { ...p, _deleted: true } : p)
      );
    } else {
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
      setShowUnsavedDialog(true);
      return;
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

              {/* Parent Class Selector - Available for both instances and classes */}
              <div className="space-y-2">
                <Label htmlFor="class">Parent Equipment Class (Optional)</Label>
                <Select
                  value={formData.class || undefined}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, class: value }))}
                  disabled={loading || loadingClasses}
                >
                  <SelectTrigger id="class">
                    <SelectValue placeholder="Select a parent class to inherit parameters" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses
                      .filter(cls => cls.id !== formData.id) // Prevent self-reference
                      .map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} ({cls.id})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.isClass 
                    ? "Classes can inherit from other classes to create multi-level hierarchies. All parameters are inherited through generations."
                    : "Select a parent class to inherit its parameters. The instance will inherit parameters from the full class hierarchy."}
                </p>
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
            ) : (inheritedParameterGroups.length === 0 && visibleParameters.length === 0) ? (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No parameters defined yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Inherited Parameters - Grouped by Class (Oldest to Newest) */}
                {inheritedParameterGroups.map((group, groupIndex) => {
                  const isCollapsed = collapsedGroups.has(group.classId);
                  
                  return (
                    <div key={group.classId} className="space-y-2">
                      {/* Group Header */}
                      <button
                        onClick={() => toggleGroupCollapse(group.classId)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-purple-50/50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        )}
                        <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                          {group.className}
                        </span>
                        <span className="text-xs text-purple-700 dark:text-purple-300">
                          ({group.parameters.length} parameter{group.parameters.length !== 1 ? 's' : ''})
                        </span>
                        {groupIndex === 0 && (
                          <span className="ml-auto text-xs text-purple-600 dark:text-purple-400 italic">
                            oldest ancestor
                          </span>
                        )}
                        {groupIndex === inheritedParameterGroups.length - 1 && (
                          <span className="ml-auto text-xs text-purple-600 dark:text-purple-400 italic">
                            direct parent
                          </span>
                        )}
                      </button>

                      {/* Group Parameters */}
                      {!isCollapsed && (
                        <div className="ml-6 space-y-3 border-l-2 border-purple-200 dark:border-purple-800 pl-4">
                          {group.parameters.map((param) => (
                            <div
                              key={param.id}
                              className="border border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-900/10 rounded-lg p-4"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold text-foreground">{param.name}</p>
                                    <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">
                                      {param.type}
                                    </span>
                                  </div>
                                  {param.description && (
                                    <p className="text-sm text-muted-foreground mt-1 mb-2">
                                      {param.description}
                                    </p>
                                  )}
                                  <div className="flex gap-4 text-xs text-muted-foreground items-center">
                                    <span className="flex items-center gap-1">
                                      <strong>UOM:</strong> {param.uom}
                                    </span>
                                    {param.valueDefinition && renderValueDefinitionBadges(param.valueDefinition, param.type)}
                                  </div>
                                </div>
                                <div className="ml-4 text-xs text-purple-600 dark:text-purple-400 italic">
                                  Read-only
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Own Parameters */}
                {visibleParameters.length > 0 && (
                  <div className="space-y-2">
                    <div className="px-3 py-2 rounded-md bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Own Parameters
                      </span>
                      <span className="text-xs text-blue-700 dark:text-blue-300 ml-2">
                        ({visibleParameters.length} parameter{visibleParameters.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <div className="ml-6 space-y-3 border-l-2 border-blue-200 dark:border-blue-800 pl-4">
                      {visibleParameters.map((param) => {
                        const paramId = param.id || param.tempId!;
                        const isNew = !param.id;
                        const isModified = param._modified && param.id;
                        
                        return (
                          <div
                            key={paramId}
                            className="border border-border rounded-lg p-4"
                          >
                            <div className="flex items-start justify-between">
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
                                <div className="flex gap-4 text-xs text-muted-foreground items-center">
                                  <span className="flex items-center gap-1">
                                    <strong>UOM:</strong> {param.uom}
                                  </span>
                                  {param.valueDefinition && renderValueDefinitionBadges(param.valueDefinition, param.type)}
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
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteParameter(paramId)}
                                  disabled={showParameterForm || loading}
                                  className="gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Delete parameter confirmation */}
      <AlertDialog open={pendingDeleteParamId !== null} onOpenChange={(open) => !open && setPendingDeleteParamId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete parameter</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The parameter will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteParameter}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved changes confirmation */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. If you leave now, your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => navigate('/app/equipments')}
            >
              Leave without saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
