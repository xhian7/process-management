import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Package, Settings } from 'lucide-react';
import { equipmentApi, type Equipment } from '../../services/equipmentApi';
import { equipmentParameterApi, type EquipmentParameter } from '../../services/equipmentParameterApi';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

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

export function EquipmentDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [parameters, setParameters] = useState<EquipmentParameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadEquipment(id);
      loadParameters(id);
    }
  }, [id]);

  const loadEquipment = async (equipmentId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await equipmentApi.getById(equipmentId);
      setEquipment(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load equipment');
    } finally {
      setLoading(false);
    }
  };

  const loadParameters = async (equipmentId: string) => {
    try {
      const data = await equipmentParameterApi.getAll(equipmentId);
      setParameters(data);
    } catch (err) {
      console.error('Failed to load parameters:', err);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this equipment?')) {
      return;
    }

    try {
      setDeleting(true);
      await equipmentApi.delete(id);
      navigate('/app/equipments');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete equipment');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading equipment...</div>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="p-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error || 'Equipment not found'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/app/equipments')}>
              Back to Equipment
            </Button>
          </CardContent>
        </Card>
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
            onClick={() => navigate('/app/equipments')}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Equipment
          </Button>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-semibold text-foreground">
                  {equipment.name}
                </h1>
                {equipment.isClass && (
                  <span className="px-3 py-1 bg-accent text-accent-foreground rounded-md font-medium">
                    Class
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">ID: {equipment.id}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/app/equipments/${equipment.id}/edit`)}
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleting}
                className="gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Equipment ID</Label>
                <p className="text-sm text-foreground font-mono mt-1">
                  {equipment.id}
                </p>
              </div>
              <div>
                <Label>Name</Label>
                <p className="text-sm text-foreground mt-1">{equipment.name}</p>
              </div>
              {equipment.description && (
                <div>
                  <Label>Description</Label>
                  <p className="text-sm text-foreground mt-1">
                    {equipment.description}
                  </p>
                </div>
              )}
              <div>
                <Label>Type</Label>
                <p className="text-sm text-foreground mt-1">
                  {equipment.isClass ? 'Equipment Class' : 'Equipment Instance'}
                </p>
              </div>
              {equipment.parentClass && (
                <div>
                  <Label>Parent Class</Label>
                  <button
                    onClick={() => navigate(`/app/equipments/${equipment.parentClass!.id}`)}
                    className="text-sm text-accent hover:underline mt-1 block"
                  >
                    {equipment.parentClass.name}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Parameters
              </CardTitle>
              <CardDescription>
                Configuration parameters for this equipment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {parameters.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No parameters defined yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {parameters.map((param) => (
                    <div
                      key={param.id}
                      className="border border-border rounded-lg p-4"
                    >
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Child Equipment */}
          {equipment.childEquipment && equipment.childEquipment.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Child Equipment</CardTitle>
                <CardDescription>
                  Equipment instances based on this class
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {equipment.childEquipment.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => navigate(`/app/equipments/${child.id}`)}
                      className="w-full flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{child.name}</p>
                          <p className="text-sm text-muted-foreground">{child.id}</p>
                        </div>
                      </div>
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-sm font-medium text-muted-foreground">
      {children}
    </label>
  );
}

