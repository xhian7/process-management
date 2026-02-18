import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit, Eye } from 'lucide-react';
import { equipmentApi, type Equipment } from '../../services/equipmentApi';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';

export function EquipmentList() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('instances');

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await equipmentApi.getAll(true, true);
      setEquipment(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment?')) {
      return;
    }

    try {
      setDeletingId(id);
      await equipmentApi.delete(id);
      await loadEquipment();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete equipment');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEquipment = equipment.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate classes and instances
  const classes = filteredEquipment.filter((item) => item.isClass);
  const instances = filteredEquipment.filter((item) => !item.isClass);

  const renderEquipmentList = (items: Equipment[], emptyMessage: string) => {
    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {searchTerm ? 'No equipment found matching your search' : emptyMessage}
            </p>
            {!searchTerm && (
              <Button
                onClick={() => navigate('/app/equipments/new')}
                className="mt-4 gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Equipment
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {item.name}
                    </h3>
                    <span className="text-xs font-mono px-2 py-1 bg-muted text-muted-foreground rounded">
                      {item.id}
                    </span>
                    {item.isClass && (
                      <span className="text-xs px-2 py-1 bg-accent text-accent-foreground rounded font-medium">
                        Class
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-muted-foreground text-sm mb-3">
                      {item.description}
                    </p>
                  )}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {item.equipmentParameters && item.equipmentParameters.length > 0 && (
                      <span>{item.equipmentParameters.length} parameter(s)</span>
                    )}
                    {item.childEquipment && item.childEquipment.length > 0 && (
                      <span>{item.childEquipment.length} child equipment</span>
                    )}
                    {item.parentClass && (
                      <span>Class: {item.parentClass.name}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/app/equipments/${item.id}`)}
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/app/equipments/${item.id}/edit`)}
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
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
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading equipment...</div>
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
            <Button onClick={loadEquipment}>Retry</Button>
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
              <h1 className="text-3xl font-semibold text-foreground">Equipment</h1>
              <p className="text-muted-foreground mt-1">
                Manage your equipment and classes
              </p>
            </div>
            <Button
              onClick={() => navigate('/app/equipments/new')}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Equipment
            </Button>
          </div>

          {/* Search */}
          <Input
            type="text"
            placeholder="Search equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="instances" className="gap-2">
              Instances
              {instances.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                  {instances.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="classes" className="gap-2">
              Classes
              {classes.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                  {classes.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="instances">
            {renderEquipmentList(instances, 'No equipment instances yet')}
          </TabsContent>

          <TabsContent value="classes">
            {renderEquipmentList(classes, 'No equipment classes yet')}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Package({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}
