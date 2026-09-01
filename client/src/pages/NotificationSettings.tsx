import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Bell, Mail, CheckCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function NotificationSettings() {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: preferences, isLoading, refetch } = trpc.notifications.getDigestPreferences.useQuery();
  const updateMutation = trpc.notifications.updateDigestPreferences.useMutation({
    onSuccess: () => {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      refetch();
    },
  });

  const [formData, setFormData] = useState({
    enabled: true,
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'never',
    dayOfWeek: 1,
    hourOfDay: 9,
    includeNewDiscussions: true,
    includePopularDiscussions: true,
    includeNewBlogPosts: true,
    includeUpcomingEvents: true,
    includeNewMembers: false,
    minEngagementLevel: 'all' as const,
  });

  useEffect(() => {
    if (preferences) {
      setFormData({
        enabled: preferences.enabled,
        frequency: preferences.frequency as any,
        dayOfWeek: preferences.dayOfWeek || 1,
        hourOfDay: preferences.hourOfDay || 9,
        includeNewDiscussions: preferences.includeNewDiscussions,
        includePopularDiscussions: preferences.includePopularDiscussions,
        includeNewBlogPosts: preferences.includeNewBlogPosts,
        includeUpcomingEvents: preferences.includeUpcomingEvents,
        includeNewMembers: preferences.includeNewMembers,
        minEngagementLevel: preferences.minEngagementLevel as any,
      });
    }
  }, [preferences]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync(formData);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
        <p className="text-muted-foreground">Customize how and when you receive community updates</p>
      </div>

      {/* Email Digest Section */}
      <Card className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-primary mt-1" />
            <div>
              <h2 className="text-xl font-semibold mb-1">Email Digest</h2>
              <p className="text-sm text-muted-foreground">Receive curated community updates via email</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.enabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, enabled: checked as boolean })
              }
            />
            <span className="text-sm font-medium">{formData.enabled ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>

        {formData.enabled && (
          <div className="space-y-4 pt-4 border-t">
            {/* Frequency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Frequency</label>
                <Select value={formData.frequency} onValueChange={(v: any) => setFormData({ ...formData, frequency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.frequency !== 'never' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Time of Day</label>
                  <Select value={formData.hourOfDay.toString()} onValueChange={(v) => setFormData({ ...formData, hourOfDay: parseInt(v) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hours.map((h) => (
                        <SelectItem key={h} value={h.toString()}>
                          {h.toString().padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {formData.frequency === 'weekly' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Day of Week</label>
                <Select value={formData.dayOfWeek.toString()} onValueChange={(v) => setFormData({ ...formData, dayOfWeek: parseInt(v) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dayNames.map((day, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Content Preferences */}
            <div className="pt-4 border-t space-y-3">
              <h3 className="font-medium">Include in Digest</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.includeNewDiscussions}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, includeNewDiscussions: checked as boolean })
                    }
                  />
                  <span className="text-sm">New discussions</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.includePopularDiscussions}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, includePopularDiscussions: checked as boolean })
                    }
                  />
                  <span className="text-sm">Popular discussions (trending)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.includeNewBlogPosts}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, includeNewBlogPosts: checked as boolean })
                    }
                  />
                  <span className="text-sm">New blog posts</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.includeUpcomingEvents}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, includeUpcomingEvents: checked as boolean })
                    }
                  />
                  <span className="text-sm">Upcoming events</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.includeNewMembers}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, includeNewMembers: checked as boolean })
                    }
                  />
                  <span className="text-sm">New members in the community</span>
                </label>
              </div>
            </div>

            {/* Engagement Filter */}
            <div className="pt-4 border-t">
              <label className="text-sm font-medium mb-2 block">Minimum Engagement Level</label>
              <Select value={formData.minEngagementLevel} onValueChange={(v: any) => setFormData({ ...formData, minEngagementLevel: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All discussions</SelectItem>
                  <SelectItem value="high">High engagement (5+ replies)</SelectItem>
                  <SelectItem value="very_high">Very high engagement (10+ replies)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Only include discussions with this level of engagement</p>
            </div>
          </div>
        )}
      </Card>

      {/* In-App Notifications */}
      <Card className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-primary mt-1" />
          <div>
            <h2 className="text-xl font-semibold mb-1">In-App Notifications</h2>
            <p className="text-sm text-muted-foreground">You receive real-time notifications for replies to your discussions</p>
          </div>
        </div>
        <Badge>Always Enabled</Badge>
      </Card>

      {/* Save Button */}
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={isSaving || updateMutation.isPending}
          className="gap-2"
        >
          {isSaving || updateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Save Preferences
            </>
          )}
        </Button>
        {saveSuccess && (
          <Badge className="bg-green-500">Saved successfully</Badge>
        )}
      </div>
    </div>
  );
}
