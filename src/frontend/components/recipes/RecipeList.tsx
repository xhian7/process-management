import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit, FlaskConical } from 'lucide-react';
import { recipeApi, type Recipe } from '../../services/recipeApi';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';

export function RecipeList() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await recipeApi.getAll();
      setRecipes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) {
      return;
    }

    try {
      setDeletingId(id);
      await recipeApi.delete(id);
      await loadRecipes();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete recipe');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredRecipes = recipes.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading recipes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadRecipes}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Recipes</h1>
              <p className="text-muted-foreground mt-1">
                Manage your process recipes
              </p>
            </div>
            <Button
              onClick={() => navigate('/app/recipes/new')}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Recipe
            </Button>
          </div>

          {/* Search */}
          <Input
            type="text"
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {filteredRecipes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FlaskConical className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {searchTerm
                  ? 'No recipes found matching your search'
                  : 'No recipes yet'}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => navigate('/app/recipes/new')}
                  className="mt-4 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Recipe
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRecipes.map((recipe) => (
              <Card key={recipe.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {recipe.name}
                        </h3>
                        <span className="text-xs font-mono px-2 py-1 bg-muted text-muted-foreground rounded">
                          {recipe.id}
                        </span>
                        <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded border border-emerald-500/20">
                          RECIPE
                        </span>
                      </div>
                      {recipe.description && (
                        <p className="text-muted-foreground text-sm mb-3">
                          {recipe.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/app/recipes/${recipe.id}/edit`)}
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(recipe.id)}
                        disabled={deletingId === recipe.id}
                        className="gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
