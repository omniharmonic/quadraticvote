'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Move,
  Save,
  X,
  AlertTriangle,
  List,
  FileText,
  Eye
} from 'lucide-react';
import Navigation from '@/components/layout/navigation';

interface Option {
  id: string;
  title: string;
  description: string;
  order: number;
  isActive: boolean;
  voteCount?: number;
  creditCount?: number;
}

export default function OptionsManagementPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);

  // Form state
  const [optionForm, setOptionForm] = useState({
    title: '',
    description: '',
    isActive: true,
  });

  useEffect(() => {
    fetchEventAndOptions();
  }, [eventId]);

  const fetchEventAndOptions = async () => {
    try {
      const eventResponse = await fetch(`/api/events/${eventId}`);
      const eventData = await eventResponse.json();

      if (eventData.success) {
        setEvent(eventData.event);
        setOptions(eventData.event.options || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load event and options',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/events/${eventId}/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: optionForm.title,
          description: optionForm.description,
          isActive: optionForm.isActive,
          order: options.length,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Option added successfully!',
          description: 'The new option has been added to your event.',
        });

        setOptionForm({ title: '', description: '', isActive: true });
        setShowAddDialog(false);
        fetchEventAndOptions();
      } else {
        throw new Error(data.message || 'Failed to add option');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add option',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) return;

    setSaving(true);

    try {
      const response = await fetch(`/api/events/${eventId}/options/${selectedOption.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: optionForm.title,
          description: optionForm.description,
          isActive: optionForm.isActive,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Option updated successfully!',
          description: 'The option has been updated.',
        });

        setOptionForm({ title: '', description: '', isActive: true });
        setShowEditDialog(false);
        setSelectedOption(null);
        fetchEventAndOptions();
      } else {
        throw new Error(data.message || 'Failed to update option');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update option',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOption = async () => {
    if (!selectedOption) return;

    setSaving(true);

    try {
      const response = await fetch(`/api/events/${eventId}/options/${selectedOption.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Option deleted successfully!',
          description: 'The option has been removed from your event.',
        });

        setShowDeleteDialog(false);
        setSelectedOption(null);
        fetchEventAndOptions();
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete option');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete option',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReorderOptions = async (newOrder: Option[]) => {
    setSaving(true);

    try {
      const response = await fetch(`/api/events/${eventId}/options/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optionIds: newOrder.map(option => option.id),
        }),
      });

      if (response.ok) {
        setOptions(newOrder);
        toast({
          title: 'Options reordered successfully!',
          description: 'The option order has been updated.',
        });
      } else {
        throw new Error('Failed to reorder options');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reorder options',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const moveOption = (index: number, direction: 'up' | 'down') => {
    const newOptions = [...options];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex >= 0 && newIndex < newOptions.length) {
      [newOptions[index], newOptions[newIndex]] = [newOptions[newIndex], newOptions[index]];
      handleReorderOptions(newOptions);
    }
  };

  const openEditDialog = (option: Option) => {
    setSelectedOption(option);
    setOptionForm({
      title: option.title,
      description: option.description,
      isActive: option.isActive,
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (option: Option) => {
    setSelectedOption(option);
    setShowDeleteDialog(true);
  };

  const isEventActive = () => {
    if (!event) return false;
    const now = new Date();
    return now >= new Date(event.startTime) && now <= new Date(event.endTime);
  };

  const hasVotes = options.some(option => (option.voteCount || 0) > 0);

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading options management...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        eventId={eventId}
        eventTitle={event.title}
        showAdminNav={true}
      />

      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push(`/admin/events/${eventId}`)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Event Management
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Manage Options</h1>
            <p className="text-gray-600 mt-1">
              Edit voting options for: <span className="font-medium">{event.title}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              {options.length} options
            </Badge>

            <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Option
            </Button>
          </div>
        </div>

        {/* Warning for active events */}
        {isEventActive() && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-900">Event is currently active</h4>
                <p className="text-sm text-orange-700 mt-1">
                  Making changes to options while voting is in progress may affect the results.
                  {hasVotes && " Some options have already received votes."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Options List */}
        <div className="space-y-4">
          {options.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No options yet</h3>
                <p className="text-gray-600 mb-4">
                  Add your first voting option to get started.
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  Add First Option
                </Button>
              </CardContent>
            </Card>
          ) : (
            options.map((option, index) => (
              <Card key={option.id} className={!option.isActive ? 'opacity-60' : ''}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <h4 className="font-medium text-gray-900">{option.title}</h4>
                        {!option.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {(option.voteCount || 0) > 0 && (
                          <Badge variant="default">
                            {option.voteCount} votes
                          </Badge>
                        )}
                      </div>

                      {option.description && (
                        <p className="text-sm text-gray-600 mb-3">{option.description}</p>
                      )}

                      {(option.voteCount || option.creditCount) && (
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {option.voteCount && (
                            <span>Votes: {option.voteCount}</span>
                          )}
                          {option.creditCount && (
                            <span>Credits: {option.creditCount}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Reorder buttons */}
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveOption(index, 'up')}
                          disabled={index === 0 || saving}
                          className="h-6 w-6 p-0"
                        >
                          <Move className="w-3 h-3 rotate-180" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveOption(index, 'down')}
                          disabled={index === options.length - 1 || saving}
                          className="h-6 w-6 p-0"
                        >
                          <Move className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Action buttons */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(option)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDeleteDialog(option)}
                        disabled={(option.voteCount || 0) > 0}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Preview Section */}
        {options.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Preview
              </CardTitle>
              <CardDescription>
                How these options will appear to voters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {options.filter(opt => opt.isActive).map((option, index) => (
                  <div key={option.id} className="p-4 border rounded-lg bg-white">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{option.title}</h4>
                        {option.description && (
                          <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                        )}
                      </div>
                      <Badge variant="outline">#{index + 1}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Option Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Option</DialogTitle>
            <DialogDescription>
              Create a new voting option for your event.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddOption} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Option Title *</Label>
              <Input
                id="title"
                value={optionForm.title}
                onChange={(e) => setOptionForm({ ...optionForm, title: e.target.value })}
                placeholder="Enter option title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={optionForm.description}
                onChange={(e) => setOptionForm({ ...optionForm, description: e.target.value })}
                placeholder="Provide more details about this option..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !optionForm.title.trim()}>
                {saving ? 'Adding...' : 'Add Option'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Option Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Option</DialogTitle>
            <DialogDescription>
              Update the details of this voting option.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditOption} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editTitle">Option Title *</Label>
              <Input
                id="editTitle"
                value={optionForm.title}
                onChange={(e) => setOptionForm({ ...optionForm, title: e.target.value })}
                placeholder="Enter option title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                value={optionForm.description}
                onChange={(e) => setOptionForm({ ...optionForm, description: e.target.value })}
                placeholder="Provide more details about this option..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !optionForm.title.trim()}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Option Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Option</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedOption?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {(selectedOption?.voteCount || 0) > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This option has {selectedOption?.voteCount} votes. Deleting it will affect the results.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOption}
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Delete Option'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}