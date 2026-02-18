import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { materialApi, type CreateMaterialData, type UpdateMaterialData } from '../../services/materialApi';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

export function MaterialForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = id !== 'new' && Boolean(id);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    uom: '',
  });

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      loadMaterial(id);
    }
  }, [id, isEditing]);

  const loadMaterial = async (materialId: string) => {
    try {
      setLoadingData(true);
      setError(null);
      const material = await materialApi.getById(materialId);
      setFormData({
        id: material.id,
        name: material.name,
        description: material.description || '',
        uom: material.uom,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load material');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    // Validate required fields
    if (!formData.id && !isEditing) {
      setError('Material ID is required');
      return;
    }
    if (!formData.name) {
      setError('Material Name is required');
      return;
    }
    if (!formData.uom) {
      setError('Unit of Measure is required');
      return;
    }

    try {
      setLoading(true);

      if (isEditing && id) {
        const updateData: UpdateMaterialData = {
          name: formData.name,
          description: formData.description || undefined,
          uom: formData.uom,
        };
        await materialApi.update(id, updateData);
      } else {
        const createData: CreateMaterialData = {
          id: formData.id,
          name: formData.name,
          description: formData.description || undefined,
          uom: formData.uom,
        };
        await materialApi.create(createData);
      }

      navigate('/app/materials');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save material');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBack = () => {
    navigate('/app/materials');
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading material...</div>
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
            Back to Materials
          </Button>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-semibold text-foreground mb-2">
                {isEditing ? formData.name || 'Edit Material' : 'New Material'}
              </h1>
              <p className="text-muted-foreground">
                {isEditing ? 'Update material information' : 'Create a new material for your processes'}
              </p>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Material'}
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
          {/* Material Details */}
          <Card>
            <CardHeader>
              <CardTitle>Material Details</CardTitle>
              <CardDescription>
                Enter the basic information for the material
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* ID Field - only for new materials */}
                {!isEditing && (
                  <div className="space-y-2">
                    <Label htmlFor="id">Material ID *</Label>
                    <Input
                      id="id"
                      name="id"
                      value={formData.id}
                      onChange={handleChange}
                      placeholder="E.g., MAT-001, FLOUR-A"
                      required
                      maxLength={50}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Unique identifier for the material. Cannot be changed after creation.
                    </p>
                  </div>
                )}

                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="name">Material Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="E.g., Wheat Flour"
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
                    placeholder="Enter a detailed description of the material..."
                    rows={4}
                    disabled={loading}
                  />
                </div>

                {/* UOM Field */}
                <div className="space-y-2">
                  <Label htmlFor="uom">Unit of Measure *</Label>
                  <Input
                    id="uom"
                    name="uom"
                    value={formData.uom}
                    onChange={handleChange}
                    placeholder="E.g., kg, L, units"
                    required
                    maxLength={20}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Specify the unit of measure used for this material
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
