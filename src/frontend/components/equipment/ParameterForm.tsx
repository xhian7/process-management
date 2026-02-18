import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import {
  equipmentParameterApi,
  type CreateParameterData,
  type UpdateParameterData,
  type EquipmentParameter,
} from '../../services/equipmentParameterApi';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

/*
 * Value Definition Structure by Type:
 * 
 * NUMBER, TEXT, BOOLEAN, TIMESTAMP:
 *   { "type": "static", "default": <value> }
 * 
 * RANGE:
 *   { "type": "range", "min": <number>, "max": <number>, "step": <number>, "default": <number> }
 *   Note: step and default are optional
 * 
 * SELECT:
 *   { "type": "select", "options": [<string>, ...], "default": <string> }
 *   Note: default is optional and must be one of the options
 */

interface ParameterFormProps {
  equipmentId?: string;
  parameter?: EquipmentParameter | (Omit<CreateParameterData, 'equipmentId'> & { tempId?: string });
  onSuccess: (parameterData?: CreateParameterData) => void;
  onCancel: () => void;
  inline?: boolean; // If true, renders inline; if false (default), renders as modal
}

const PARAMETER_TYPES = [
  'NUMBER',
  'TEXT',
  'BOOLEAN',
  'RANGE',
  'SELECT',
  'TIMESTAMP',
] as const;

// Parse valueDefinition from parameter
const parseValueDefinition = (vd: any, type: string) => {
  if (!vd) return null;
  
  if (type === 'RANGE') {
    return {
      min: vd.min ?? '',
      max: vd.max ?? '',
      step: vd.step ?? '',
      default: vd.default ?? '',
    };
  } else if (type === 'SELECT') {
    return {
      options: Array.isArray(vd.options) ? vd.options : [],
      default: vd.default ?? '',
    };
  } else {
    return {
      default: vd.default ?? '',
    };
  }
};

export function ParameterForm({
  equipmentId,
  parameter,
  onSuccess,
  onCancel,
  inline = false,
}: ParameterFormProps) {
  const isEditing = Boolean(parameter && 'id' in parameter && parameter.id);
  const isLocalMode = !equipmentId; // Mode for creating equipment with local parameters

  const [formData, setFormData] = useState({
    name: parameter?.name || '',
    description: parameter?.description || '',
    type: parameter?.type || 'NUMBER',
    uom: parameter?.uom || '',
  });

  // Structured value definition state based on type
  const [valueDef, setValueDef] = useState(() => 
    parseValueDefinition(parameter?.valueDefinition, parameter?.type || 'NUMBER')
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update valueDef when type changes
  useEffect(() => {
    if (formData.type === 'RANGE') {
      setValueDef({ min: '', max: '', step: '', default: '' });
    } else if (formData.type === 'SELECT') {
      setValueDef({ options: [], default: '' });
    } else {
      setValueDef({ default: '' });
    }
  }, [formData.type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);

      // Build valueDefinition from structured data
      let valueDefinition = undefined;
      
      if (valueDef) {
        if (formData.type === 'RANGE') {
          const vd = valueDef as { min: string; max: string; step: string; default: string };
          const min = parseFloat(vd.min);
          const max = parseFloat(vd.max);
          const step = vd.step ? parseFloat(vd.step) : undefined;
          const defaultVal = vd.default ? parseFloat(vd.default) : undefined;

          // Validation for RANGE
          if (isNaN(min) || isNaN(max)) {
            setError('Range type requires valid min and max values');
            return;
          }
          if (min >= max) {
            setError('Min value must be less than max value');
            return;
          }
          if (step !== undefined && (isNaN(step) || step <= 0)) {
            setError('Step must be a positive number');
            return;
          }
          if (defaultVal !== undefined && (isNaN(defaultVal) || defaultVal < min || defaultVal > max)) {
            setError('Default value must be between min and max');
            return;
          }

          valueDefinition = {
            type: 'range',
            min,
            max,
            ...(step !== undefined && { step }),
            ...(defaultVal !== undefined && { default: defaultVal }),
          };
        } else if (formData.type === 'SELECT') {
          const vd = valueDef as { options: string[]; default: string };
          
          // Validation for SELECT
          if (vd.options.length === 0) {
            setError('Select type requires at least one option');
            return;
          }
          if (vd.default && !vd.options.includes(vd.default)) {
            setError('Default value must be one of the options');
            return;
          }

          valueDefinition = {
            type: 'select',
            options: vd.options,
            ...(vd.default && { default: vd.default }),
          };
        } else {
          // Static types: NUMBER, TEXT, BOOLEAN, TIMESTAMP
          const vd = valueDef as { default: string };
          if (vd.default) {
            // Type-specific validation
            if (formData.type === 'NUMBER') {
              const num = parseFloat(vd.default);
              if (isNaN(num)) {
                setError('Default value must be a valid number');
                return;
              }
              valueDefinition = { type: 'static', default: num };
            } else if (formData.type === 'BOOLEAN') {
              const boolVal = vd.default.toLowerCase();
              if (boolVal !== 'true' && boolVal !== 'false') {
                setError('Default value must be "true" or "false"');
                return;
              }
              valueDefinition = { type: 'static', default: boolVal === 'true' };
            } else {
              valueDefinition = { type: 'static', default: vd.default };
            }
          }
        }
      }

      const parameterData: CreateParameterData = {
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
        valueDefinition,
        uom: formData.uom,
      };

      if (isLocalMode) {
        // Local mode: just return the data to parent
        onSuccess(parameterData);
      } else {
        // Server mode: save to API
        if (isEditing && parameter && 'id' in parameter) {
          await equipmentParameterApi.update(
            equipmentId!,
            parameter.id,
            parameterData as UpdateParameterData
          );
        } else {
          await equipmentParameterApi.create(
            equipmentId!,
            parameterData
          );
        }
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save parameter');
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

  // Handle value definition changes
  const handleValueDefChange = (field: string, value: string | number) => {
    setValueDef((prev: any) => {
      if (!prev) return { [field]: value };
      return { ...prev, [field]: value };
    });
  };

  // Handle SELECT options
  const [newOption, setNewOption] = useState('');
  
  const handleAddOption = () => {
    if (!newOption.trim()) return;
    const vd = (valueDef && 'options' in valueDef)
      ? (valueDef as { options: string[]; default: string })
      : { options: [], default: '' };
    if (vd.options.includes(newOption.trim())) {
      setError('Option already exists');
      return;
    }
    setValueDef({
      ...vd,
      options: [...vd.options, newOption.trim()],
    });
    setNewOption('');
    setError(null);
  };

  const handleRemoveOption = (option: string) => {
    const vd = (valueDef && 'options' in valueDef)
      ? (valueDef as { options: string[]; default: string })
      : { options: [], default: '' };
    setValueDef({
      ...vd,
      options: vd.options.filter(o => o !== option),
      default: vd.default === option ? '' : vd.default,
    });
  };

  // Render value definition fields based on type
  const renderValueDefinitionFields = () => {
    if (formData.type === 'RANGE') {
      // Ensure we have the correct structure for RANGE type
      const vd = (valueDef && 'min' in valueDef && 'max' in valueDef)
        ? (valueDef as { min: string; max: string; step: string; default: string })
        : { min: '', max: '', step: '', default: '' };
      return (
        <div className="space-y-3">
          <Label>Value Definition - Range</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="vd-min" className="text-sm text-muted-foreground">Min *</Label>
              <Input
                id="vd-min"
                type="number"
                step="any"
                value={vd.min || ''}
                onChange={(e) => handleValueDefChange('min', e.target.value)}
                placeholder="0"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vd-max" className="text-sm text-muted-foreground">Max *</Label>
              <Input
                id="vd-max"
                type="number"
                step="any"
                value={vd.max || ''}
                onChange={(e) => handleValueDefChange('max', e.target.value)}
                placeholder="100"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vd-step" className="text-sm text-muted-foreground">Step</Label>
              <Input
                id="vd-step"
                type="number"
                step="any"
                value={vd.step || ''}
                onChange={(e) => handleValueDefChange('step', e.target.value)}
                placeholder="1"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vd-default" className="text-sm text-muted-foreground">Default</Label>
              <Input
                id="vd-default"
                type="number"
                step="any"
                value={vd.default || ''}
                onChange={(e) => handleValueDefChange('default', e.target.value)}
                placeholder="50"
                disabled={loading}
              />
            </div>
          </div>
        </div>
      );
    } else if (formData.type === 'SELECT') {
      // Ensure we have the correct structure for SELECT type
      const vd = (valueDef && 'options' in valueDef) 
        ? (valueDef as { options: string[]; default: string })
        : { options: [], default: '' };
      
      return (
        <div className="space-y-3">
          <Label>Value Definition - Select Options</Label>
          
          {/* Add option input */}
          <div className="flex gap-2">
            <Input
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddOption();
                }
              }}
              placeholder="Enter option value"
              disabled={loading}
            />
            <Button
              type="button"
              onClick={handleAddOption}
              disabled={loading || !newOption.trim()}
              size="sm"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>

          {/* Options list */}
          {vd.options.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Options ({vd.options.length})</Label>
              <div className="border rounded-md p-2 space-y-1 max-h-40 overflow-y-auto">
                {vd.options.map((option, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-muted/50">
                    <span className="text-sm">{option}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveOption(option)}
                      disabled={loading}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Default value selector */}
          {vd.options.length > 0 && (
            <div className="space-y-1">
              <Label htmlFor="vd-default" className="text-sm text-muted-foreground">Default Value (Optional)</Label>
              <Select
                value={vd.default || undefined}
                onValueChange={(value) => handleValueDefChange('default', value)}
                disabled={loading}
              >
                <SelectTrigger id="vd-default">
                  <SelectValue placeholder="No default value" />
                </SelectTrigger>
                <SelectContent>
                  {vd.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      );
    } else {
      // Static types: NUMBER, TEXT, BOOLEAN, TIMESTAMP
      // Ensure we have the correct structure for static types
      const vd = (valueDef && 'default' in valueDef && !('options' in valueDef) && !('min' in valueDef))
        ? (valueDef as { default: string })
        : { default: '' };
      let inputType = 'text';
      let placeholder = 'Enter default value';
      
      if (formData.type === 'NUMBER') {
        inputType = 'number';
        placeholder = '0';
      } else if (formData.type === 'BOOLEAN') {
        inputType = 'text';
        placeholder = 'true or false';
      } else if (formData.type === 'TIMESTAMP') {
        inputType = 'datetime-local';
        placeholder = '';
      }

      return (
        <div className="space-y-3">
          <Label htmlFor="vd-default">Value Definition - Default Value (Optional)</Label>
          {formData.type === 'BOOLEAN' ? (
            <Select
              value={vd.default || undefined}
              onValueChange={(value) => handleValueDefChange('default', value)}
              disabled={loading}
            >
              <SelectTrigger id="vd-default">
                <SelectValue placeholder="No default value" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">True</SelectItem>
                <SelectItem value="false">False</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="vd-default"
              type={inputType}
              step={formData.type === 'NUMBER' ? 'any' : undefined}
              value={vd.default || ''}
              onChange={(e) => handleValueDefChange('default', e.target.value)}
              placeholder={placeholder}
              disabled={loading}
            />
          )}
          <p className="text-xs text-muted-foreground">
            Optional default value for this parameter
          </p>
        </div>
      );
    }
  };

  const formContent = (
    <>
      {/* Form */}
      <form onSubmit={handleSubmit} className={inline ? "space-y-4" : "p-6 space-y-6"}>
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Parameter Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="E.g., Temperature, Pressure, Speed"
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
              placeholder="Enter a description for this parameter..."
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Type Field */}
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, type: value }))
                }
                disabled={loading}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PARAMETER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* UOM Field */}
            <div className="space-y-2">
              <Label htmlFor="uom">Unit of Measure *</Label>
              <Input
                id="uom"
                name="uom"
                value={formData.uom}
                onChange={handleChange}
                placeholder="E.g., °C, bar, RPM"
                required
                maxLength={20}
                disabled={loading}
              />
            </div>
          </div>

          {/* Value Definition Field */}
          {renderValueDefinitionFields()}

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className={inline ? "flex gap-3 pt-2" : "flex gap-3 pt-4"}>
            <Button type="submit" disabled={loading} className="gap-2">
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : isEditing ? 'Update Parameter' : 'Create Parameter'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
    </>
  );

  if (inline) {
    return (
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            {isEditing ? 'Edit Parameter' : 'New Parameter'}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={loading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        {formContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            {isEditing ? 'Edit Parameter' : 'New Parameter'}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={loading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        {formContent}
      </div>
    </div>
  );
}
