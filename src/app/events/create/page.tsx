'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, Check, Sparkles, Target, Settings2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import Navigation from '@/components/layout/navigation';

type Framework = 'binary_selection' | 'proportional_distribution' | null;
type OptionMode = 'admin_defined' | 'community_proposals' | 'hybrid' | null;
type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface EventFormData {
  title: string;
  description: string;
  visibility: 'public' | 'private' | 'unlisted';
  startTime: string;
  endTime: string;
  framework: Framework;
  optionMode: OptionMode;
  thresholdMode?: string;
  topNCount?: number;
  percentageThreshold?: number;
  absoluteVotesThreshold?: number;
  resourceName?: string;
  resourceSymbol?: string;
  totalPoolAmount?: number;
  creditsPerVoter: number;
  options: Array<{ title: string; description: string }>;
  proposalConfig?: {
    enabled: boolean;
    submissionStart?: string;
    submissionEnd?: string;
    moderationMode: 'pre_approval' | 'post_moderation' | 'none';
    accessControl: 'open' | 'invite_only';
    maxProposalsPerUser: number;
  };
  voteSettings?: {
    allowVoteChanges: boolean;
    allowLateSubmissions: boolean;
    showLiveResults: boolean;
    requireEmailVerification: boolean;
    allowAnonymous: boolean;
    requireModeration: boolean;
  };
}

export default function CreateEventPage() {
  const router = useRouter();
  const { setAdminCode } = useAdmin();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    visibility: 'public',
    startTime: '',
    endTime: '',
    framework: null,
    optionMode: null,
    creditsPerVoter: 100,
    options: [{ title: '', description: '' }],
    proposalConfig: {
      enabled: false,
      moderationMode: 'pre_approval',
      accessControl: 'open',
      maxProposalsPerUser: 3
    },
    voteSettings: {
      allowVoteChanges: false,
      allowLateSubmissions: false,
      showLiveResults: false,
      requireEmailVerification: false,
      allowAnonymous: true,
      requireModeration: false
    }
  });

  const updateFormData = (updates: Partial<EventFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { title: '', description: '' }],
    }));
  };

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const updateOption = (index: number, field: 'title' | 'description', value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => 
        i === index ? { ...opt, [field]: value } : opt
      ),
    }));
  };

  const canProceed = (step: Step): boolean => {
    switch (step) {
      case 1:
        return !!formData.title && !!formData.startTime && !!formData.endTime;
      case 2:
        return !!formData.framework;
      case 3:
        return !!formData.optionMode;
      case 4:
        if (formData.framework === 'binary_selection') {
          if (!formData.thresholdMode) return false;

          // Validate based on threshold mode
          if (formData.thresholdMode === 'top_n') {
            return !!formData.topNCount;
          } else if (formData.thresholdMode === 'percentage') {
            return !!formData.percentageThreshold;
          } else if (formData.thresholdMode === 'absolute_votes') {
            return !!formData.absoluteVotesThreshold;
          } else if (formData.thresholdMode === 'above_average') {
            return true; // No additional input needed
          }

          return false;
        } else if (formData.framework === 'proportional_distribution') {
          return !!formData.resourceName && !!formData.resourceSymbol && !!formData.totalPoolAmount;
        }
        return false;
      case 5:
        // For admin_defined and hybrid, require at least 2 options
        if (formData.optionMode === 'admin_defined' || formData.optionMode === 'hybrid') {
          return formData.options.filter(o => o.title.trim()).length >= 2;
        }
        // For community_proposals, no options required
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Build decision framework config
      const decisionFramework = formData.framework === 'binary_selection'
        ? {
            framework_type: 'binary_selection' as const,
            config: {
              threshold_mode: formData.thresholdMode!,
              top_n_count: formData.thresholdMode === 'top_n' ? formData.topNCount : undefined,
              percentage_threshold: formData.thresholdMode === 'percentage' ? formData.percentageThreshold : undefined,
              absolute_votes_threshold: formData.thresholdMode === 'absolute_votes' ? formData.absoluteVotesThreshold : undefined,
              tiebreaker: 'timestamp' as const,
            },
          }
        : {
            framework_type: 'proportional_distribution' as const,
            config: {
              resource_name: formData.resourceName!,
              resource_symbol: formData.resourceSymbol!,
              total_pool_amount: formData.totalPoolAmount!,
            },
          };

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          visibility: formData.visibility,
          startTime: new Date(formData.startTime).toISOString(),
          endTime: new Date(formData.endTime).toISOString(),
          decisionFramework,
          optionMode: formData.optionMode,
          proposalConfig: formData.optionMode !== 'admin_defined' ? formData.proposalConfig : undefined,
          creditsPerVoter: formData.creditsPerVoter,
          initialOptions: (formData.optionMode === 'admin_defined' || formData.optionMode === 'hybrid') ? formData.options.filter(o => o.title.trim()) : undefined,
          voteSettings: formData.voteSettings,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Event created successfully!',
          description: 'Your event has been created and is ready to use.',
        });

        // Store admin code for future use
        setAdminCode(data.event.adminCode);

        // Redirect to admin page with admin code
        router.push(`/admin/events/${data.event.id}?code=${data.event.adminCode}`);
      } else {
        throw new Error(data.message || 'Failed to create event');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create event',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / 6) * 100;

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Create New Event</h1>
          <p className="text-gray-600">Set up your quadratic voting event in 4 simple steps</p>
          <Progress value={progress} className="mt-4" />
        </div>

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Tell us about your event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., Community Budget Allocation 2025"
                  value={formData.title}
                  onChange={(e) => updateFormData({ title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe what voters will be deciding..."
                  value={formData.description}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Start Time *</Label>
                  <Input
                    id="start"
                    name="start"
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => updateFormData({ startTime: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end">End Time *</Label>
                  <Input
                    id="end"
                    name="end"
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => updateFormData({ endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(value: any) => updateFormData({ visibility: value })}
                >
                  <SelectTrigger data-testid="visibility-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public" data-testid="visibility-public">Public - Anyone can view</SelectItem>
                    <SelectItem value="unlisted" data-testid="visibility-unlisted">Unlisted - Only with link</SelectItem>
                    <SelectItem value="private" data-testid="visibility-private">Private - Invite only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setCurrentStep(2)} disabled={!canProceed(1)}>
                  Next: Choose Framework <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Framework Selection */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Decision Framework</CardTitle>
              <CardDescription>Choose how results will be determined</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => updateFormData({ framework: 'binary_selection' })}
                  className={`relative p-6 border-2 rounded-lg text-left transition-all ${
                    formData.framework === 'binary_selection'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Target className="h-8 w-8 text-blue-600 mb-3" />
                  <h3 className="text-lg font-semibold mb-2">Binary Selection</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose winners from options. Best for competitions, awards, or selecting projects.
                  </p>
                  <Badge variant="secondary">Competitive</Badge>
                  {formData.framework === 'binary_selection' && (
                    <Check className="absolute top-4 right-4 h-6 w-6 text-blue-600" />
                  )}
                </button>

                <button
                  onClick={() => updateFormData({ framework: 'proportional_distribution' })}
                  className={`relative p-6 border-2 rounded-lg text-left transition-all ${
                    formData.framework === 'proportional_distribution'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Sparkles className="h-8 w-8 text-purple-600 mb-3" />
                  <h3 className="text-lg font-semibold mb-2">Proportional Distribution</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Allocate resources proportionally. Best for budgets, grants, or resource allocation.
                  </p>
                  <Badge variant="secondary">Collaborative</Badge>
                  {formData.framework === 'proportional_distribution' && (
                    <Check className="absolute top-4 right-4 h-6 w-6 text-purple-600" />
                  )}
                </button>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setCurrentStep(3)} disabled={!canProceed(2)}>
                  Next: Option Mode <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Option Mode Selection */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Option Mode</CardTitle>
              <CardDescription>Choose how voting options will be provided</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => updateFormData({
                    optionMode: 'admin_defined',
                    proposalConfig: {
                      ...formData.proposalConfig!,
                      enabled: false
                    }
                  })}
                  className={`relative p-6 border-2 rounded-lg text-left transition-all ${
                    formData.optionMode === 'admin_defined'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-4 h-4 rounded-full border-2 border-current mt-1 flex-shrink-0">
                      {formData.optionMode === 'admin_defined' && (
                        <div className="w-2 h-2 bg-current rounded-full m-0.5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Admin-Defined Options</h3>
                      <p className="text-sm text-gray-600">
                        You will pre-define all voting options. Best for structured votes with specific choices.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => updateFormData({
                    optionMode: 'community_proposals',
                    proposalConfig: {
                      ...formData.proposalConfig!,
                      enabled: true,
                      submissionStart: formData.startTime || new Date().toISOString().slice(0, 16),
                      submissionEnd: formData.endTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
                    }
                  })}
                  className={`relative p-6 border-2 rounded-lg text-left transition-all ${
                    formData.optionMode === 'community_proposals'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-4 h-4 rounded-full border-2 border-current mt-1 flex-shrink-0">
                      {formData.optionMode === 'community_proposals' && (
                        <div className="w-2 h-2 bg-current rounded-full m-0.5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Community Proposals</h3>
                      <p className="text-sm text-gray-600">
                        Community members submit proposals that become voting options. Best for open innovation and idea generation.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => updateFormData({
                    optionMode: 'hybrid',
                    proposalConfig: {
                      ...formData.proposalConfig!,
                      enabled: true,
                      submissionStart: formData.startTime || new Date().toISOString().slice(0, 16),
                      submissionEnd: formData.endTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
                    }
                  })}
                  className={`relative p-6 border-2 rounded-lg text-left transition-all ${
                    formData.optionMode === 'hybrid'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-4 h-4 rounded-full border-2 border-current mt-1 flex-shrink-0">
                      {formData.optionMode === 'hybrid' && (
                        <div className="w-2 h-2 bg-current rounded-full m-0.5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Hybrid Mode</h3>
                      <p className="text-sm text-gray-600">
                        You provide some options AND community can submit additional proposals. Best for guided participation.
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setCurrentStep(4)} disabled={!canProceed(3)}>
                  Next: Configure <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Framework Configuration */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>
                {formData.framework === 'binary_selection'
                  ? 'Binary Selection Configuration'
                  : 'Resource Distribution Configuration'}
              </CardTitle>
              <CardDescription>
                {formData.framework === 'binary_selection'
                  ? 'Set how winners will be selected'
                  : 'Define the resource pool to distribute'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.framework === 'binary_selection' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="threshold">Selection Method *</Label>
                    <Select
                      value={formData.thresholdMode}
                      onValueChange={(value) => updateFormData({ thresholdMode: value })}
                    >
                      <SelectTrigger data-testid="selection-method-dropdown">
                        <SelectValue placeholder="Choose selection method..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top_n" data-testid="selection-method-top-n">Top N - Select top ranked options</SelectItem>
                        <SelectItem value="percentage" data-testid="selection-method-percentage">Percentage - Options above % of max votes</SelectItem>
                        <SelectItem value="absolute_votes" data-testid="selection-method-absolute">Absolute - Options above vote threshold</SelectItem>
                        <SelectItem value="above_average" data-testid="selection-method-above-average">Above Average - Options above mean</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.thresholdMode === 'top_n' && (
                    <div className="space-y-2">
                      <Label htmlFor="topN">Number of Winners *</Label>
                      <Input
                        id="topN"
                        name="topN"
                        type="number"
                        min="1"
                        placeholder="e.g., 3"
                        value={formData.topNCount || ''}
                        onChange={(e) => updateFormData({ topNCount: parseInt(e.target.value) })}
                      />
                      <p className="text-sm text-gray-500">How many options should be selected?</p>
                    </div>
                  )}

                  {formData.thresholdMode === 'percentage' && (
                    <div className="space-y-2">
                      <Label htmlFor="percentage">Percentage Threshold *</Label>
                      <Input
                        id="percentage"
                        name="percentage"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="e.g., 20"
                        value={formData.percentageThreshold || ''}
                        onChange={(e) => updateFormData({ percentageThreshold: parseFloat(e.target.value) })}
                      />
                      <p className="text-sm text-gray-500">
                        Options must receive at least this percentage of the maximum votes to be selected
                      </p>
                    </div>
                  )}

                  {formData.thresholdMode === 'absolute_votes' && (
                    <div className="space-y-2">
                      <Label htmlFor="absolute">Minimum Vote Threshold *</Label>
                      <Input
                        id="absolute"
                        name="absolute"
                        type="number"
                        min="1"
                        placeholder="e.g., 10"
                        value={formData.absoluteVotesThreshold || ''}
                        onChange={(e) => updateFormData({ absoluteVotesThreshold: parseFloat(e.target.value) })}
                      />
                      <p className="text-sm text-gray-500">
                        Options must receive at least this many votes to be selected
                      </p>
                    </div>
                  )}

                  {formData.thresholdMode === 'above_average' && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Above Average Selection</h4>
                      <p className="text-sm text-blue-700">
                        Options that receive more votes than the average across all options will be automatically selected.
                        No additional configuration needed.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="resourceName">Resource Name *</Label>
                    <Input
                      id="resourceName"
                      name="resourceName"
                      placeholder="e.g., Budget, ETH, Hours"
                      value={formData.resourceName || ''}
                      onChange={(e) => updateFormData({ resourceName: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resourceSymbol">Resource Symbol *</Label>
                    <Input
                      id="resourceSymbol"
                      name="resourceSymbol"
                      placeholder="e.g., $, ETH, hrs"
                      value={formData.resourceSymbol || ''}
                      onChange={(e) => updateFormData({ resourceSymbol: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="totalPool">Total Pool Amount *</Label>
                    <Input
                      id="totalPool"
                      name="totalPool"
                      type="number"
                      min="1"
                      placeholder="e.g., 100000"
                      value={formData.totalPoolAmount || ''}
                      onChange={(e) => updateFormData({ totalPoolAmount: parseFloat(e.target.value) })}
                    />
                    <p className="text-sm text-gray-500">
                      This amount will be distributed proportionally across options
                    </p>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="credits">Credits Per Voter</Label>
                <Input
                  id="credits"
                  name="credits"
                  type="number"
                  min="10"
                  max="1000"
                  value={formData.creditsPerVoter}
                  onChange={(e) => updateFormData({ creditsPerVoter: parseInt(e.target.value) })}
                />
                <p className="text-sm text-gray-500">Each voter gets this many credits to allocate</p>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(3)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={() => (formData.optionMode === 'admin_defined' || formData.optionMode === 'hybrid') ? setCurrentStep(5) : setCurrentStep(6)}
                  disabled={!canProceed(4)}
                >
                  {(formData.optionMode === 'admin_defined' || formData.optionMode === 'hybrid') ? (
                    <>Next: Add Options <ArrowRight className="ml-2 h-4 w-4" /></>
                  ) : (
                    <>Next: Vote Settings <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Options (for admin_defined and hybrid modes) */}
        {currentStep === 5 && (formData.optionMode === 'admin_defined' || formData.optionMode === 'hybrid') && (
          <Card>
            <CardHeader>
              <CardTitle>Voting Options</CardTitle>
              <CardDescription>Add the options voters will choose from (minimum 2)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.options.map((option, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Option {index + 1}</h4>
                    {formData.options.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeOption(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input
                      name={`option-${index}-title`}
                      placeholder="Option title"
                      value={option.title}
                      onChange={(e) => updateOption(index, 'title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Textarea
                      name={`option-${index}-description`}
                      placeholder="Option description (optional)"
                      value={option.description}
                      onChange={(e) => updateOption(index, 'description', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addOption} className="w-full">
                + Add Another Option
              </Button>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCurrentStep(4)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={() => setCurrentStep(6)}
                  disabled={!canProceed(5)}
                >
                  Next: Vote Settings <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 6: Vote Settings */}
        {currentStep === 6 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                Vote Settings
              </CardTitle>
              <CardDescription>Configure how voting works for your event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Allow Vote Changes */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="allowVoteChanges" className="text-base font-medium">
                    Allow Vote Changes
                  </Label>
                  <p className="text-sm text-gray-600">
                    Let voters modify their votes after submission
                  </p>
                </div>
                <Switch
                  id="allowVoteChanges"
                  checked={formData.voteSettings?.allowVoteChanges || false}
                  onCheckedChange={(checked) =>
                    updateFormData({
                      voteSettings: {
                        ...formData.voteSettings!,
                        allowVoteChanges: checked
                      }
                    })
                  }
                />
              </div>

              {/* Allow Late Submissions */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="allowLateSubmissions" className="text-base font-medium">
                    Allow Late Submissions
                  </Label>
                  <p className="text-sm text-gray-600">
                    Accept votes after the end time
                  </p>
                </div>
                <Switch
                  id="allowLateSubmissions"
                  checked={formData.voteSettings?.allowLateSubmissions || false}
                  onCheckedChange={(checked) =>
                    updateFormData({
                      voteSettings: {
                        ...formData.voteSettings!,
                        allowLateSubmissions: checked
                      }
                    })
                  }
                />
              </div>

              {/* Show Live Results */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="showLiveResults" className="text-base font-medium">
                    Show Live Results
                  </Label>
                  <p className="text-sm text-gray-600">
                    Display results in real-time during voting
                  </p>
                </div>
                <Switch
                  id="showLiveResults"
                  checked={formData.voteSettings?.showLiveResults || false}
                  onCheckedChange={(checked) =>
                    updateFormData({
                      voteSettings: {
                        ...formData.voteSettings!,
                        showLiveResults: checked
                      }
                    })
                  }
                />
              </div>

              {/* Require Email Verification */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="requireEmailVerification" className="text-base font-medium">
                    Require Email Verification
                  </Label>
                  <p className="text-sm text-gray-600">
                    Voters must verify their email before voting
                  </p>
                </div>
                <Switch
                  id="requireEmailVerification"
                  checked={formData.voteSettings?.requireEmailVerification || false}
                  onCheckedChange={(checked) =>
                    updateFormData({
                      voteSettings: {
                        ...formData.voteSettings!,
                        requireEmailVerification: checked
                      }
                    })
                  }
                />
              </div>

              {/* Allow Anonymous Participation */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="allowAnonymous" className="text-base font-medium">
                    Allow Anonymous Participation
                  </Label>
                  <p className="text-sm text-gray-600">
                    Allow voters to participate without invite codes for public events
                  </p>
                </div>
                <Switch
                  id="allowAnonymous"
                  checked={formData.voteSettings?.allowAnonymous || false}
                  onCheckedChange={(checked) =>
                    updateFormData({
                      voteSettings: {
                        ...formData.voteSettings!,
                        allowAnonymous: checked
                      }
                    })
                  }
                />
              </div>

              {/* Proposal Moderation (only show for community_proposals or hybrid) */}
              {(formData.optionMode === 'community_proposals' || formData.optionMode === 'hybrid') && (
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="requireModeration" className="text-base font-medium">
                      Require Proposal Moderation
                    </Label>
                    <p className="text-sm text-gray-600">
                      All proposals must be manually approved before voting
                    </p>
                  </div>
                  <Switch
                    id="requireModeration"
                    checked={formData.voteSettings?.requireModeration || false}
                    onCheckedChange={(checked) =>
                      updateFormData({
                        voteSettings: {
                          ...formData.voteSettings!,
                          requireModeration: checked
                        },
                        proposalConfig: {
                          ...formData.proposalConfig!,
                          moderationMode: checked ? 'pre_approval' : 'none'
                        }
                      })
                    }
                  />
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCurrentStep(formData.optionMode === 'admin_defined' || formData.optionMode === 'hybrid' ? 5 : 4)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Event'}
                  <Check className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </>
  );
}

