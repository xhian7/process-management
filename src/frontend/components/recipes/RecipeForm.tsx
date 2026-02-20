import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, GitBranchPlus } from 'lucide-react';
import { recipeApi, type UpdateRecipeData } from '../../services/recipeApi';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

export function RecipeForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = id !== 'new' && Boolean(id);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
  });

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      loadRecipe(id);
    }
  }, [id, isEditing]);

  const loadRecipe = async (recipeId: string) => {
    try {
      setLoadingData(true);
      setError(null);
      const recipe = await recipeApi.getById(recipeId);
      setFormData({
        id: recipe.id,
        name: recipe.name,
        description: recipe.description || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipe');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!isEditing && !formData.id) {
      setError('Recipe ID is required');
      return;
    }
    if (!formData.name) {
      setError('Product Name is required');
      return;
    }

    try {
      setLoading(true);

      if (isEditing && id) {
        const updateData: UpdateRecipeData = {
          name: formData.name,
          description: formData.description || null,
        };
        await recipeApi.update(id, updateData);
      } else {
        await recipeApi.create({
          id: formData.id,
          name: formData.name,
          description: formData.description || undefined,
          type: 'RECIPE',
        });
      }

      navigate('/app/recipes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading recipe...</div>
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
            onClick={() => navigate('/app/recipes')}
            className="gap-2 mb-4"
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Recipes
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-semibold text-foreground mb-2">
                {isEditing ? formData.name || 'Edit Recipe' : 'New Recipe'}
              </h1>
              <p className="text-muted-foreground">
                {isEditing
                  ? 'Update recipe information'
                  : 'Create a new recipe for your processes'}
              </p>
            </div>
            <div className="flex gap-2">
              {isEditing && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/app/recipes/${id}/workflow`)}
                  className="gap-2"
                >
                  <GitBranchPlus className="w-4 h-4" />
                  Edit Workflow
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Recipe'}
              </Button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 mb-6">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recipe Details</CardTitle>
            <CardDescription>
              Enter the basic information for the recipe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* ID — only on create */}
              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="id">Recipe ID *</Label>
                  <Input
                    id="id"
                    name="id"
                    value={formData.id}
                    onChange={handleChange}
                    placeholder="E.g., RCP-001"
                    required
                    maxLength={50}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier for the recipe. Cannot be changed after creation.
                  </p>
                </div>
              )}

              {/* Product Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="E.g., Chocolate Cake"
                  required
                  maxLength={255}
                  disabled={loading}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Optional description of the recipe..."
                  rows={4}
                  disabled={loading}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
