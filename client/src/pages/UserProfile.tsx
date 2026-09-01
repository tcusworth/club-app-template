import { useRoute, useLocation } from 'wouter';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Trophy, Calendar, MapPin, Loader2, Edit2, Star, Zap, Crown } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

export default function UserProfile() {
  const [, params] = useRoute('/members/:id');
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const userId = params?.id ? parseInt(params.id) : null;
  const isOwnProfile = userId === currentUser?.id;

  const { data: profile, isLoading } = trpc.members.getProfile.useQuery(
    { userId: userId || 0 },
    { enabled: !!userId }
  );

  const { data: activities } = trpc.members.getActivityFeed.useQuery(
    { userId: userId || 0, limit: 20 },
    { enabled: !!userId }
  );

  if (!userId) {
    return <div className="text-center py-12">User not found</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center py-12">User not found</div>;
  }

  const initials = (profile.name || profile.email || '?')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const ROLE_LABELS: Record<string, string> = {
    owner_operator: 'Owner/Operator',
    epc_integrator: 'EPC/Integrator',
    automation_engineer: 'Automation Engineer',
    executive: 'Executive',
    vendor: 'Vendor',
    analyst: 'Analyst',
    admin: 'Admin',
    user: 'Member',
  };

  // Calculate member tier based on reputation
  const getMemberTier = (reputation: number) => {
    if (reputation >= 500) return { name: 'Expert', icon: Crown, color: 'text-amber-500' };
    if (reputation >= 250) return { name: 'Contributor', icon: Star, color: 'text-blue-500' };
    if (reputation >= 100) return { name: 'Active', icon: Zap, color: 'text-green-500' };
    return { name: 'Member', icon: Trophy, color: 'text-gray-500' };
  };

  const tier = getMemberTier(profile.reputation || 0);
  const TierIcon = tier.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={undefined} />
                <AvatarFallback className="bg-primary/20 text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{profile.name || profile.email}</h1>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge>{ROLE_LABELS[profile.role] || profile.role}</Badge>
                  <Badge variant="outline" className={`gap-1 ${tier.color}`}>
                    <TierIcon className="w-3 h-3" />
                    {tier.name}
                  </Badge>

                </div>
                {profile.bio && <p className="text-muted-foreground">{profile.bio}</p>}
              </div>
            </div>
            {isOwnProfile && (
              <Button
                onClick={() => setLocation('/settings/profile')}
                variant="outline"
                className="gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Discussions</div>
            <div className="text-2xl font-bold">{profile.discussionCount || 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Replies</div>
            <div className="text-2xl font-bold">{profile.replyCount || 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Reputation</div>
            <div className="text-2xl font-bold">{profile.reputation || 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Followers</div>
            <div className="text-2xl font-bold">{profile.followerCount || 0}</div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList>
            <TabsTrigger value="activity">Activity Feed</TabsTrigger>
            <TabsTrigger value="discussions">Discussions</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          {/* Activity Feed Tab */}
          <TabsContent value="activity" className="space-y-3">
            {!activities || activities.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No activity yet
              </Card>
            ) : (
              activities.map((activity: any) => (
                <Card key={activity.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {activity.type === 'discussion' && (
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                      )}
                      {activity.type === 'reply' && (
                        <MessageSquare className="w-5 h-5 text-green-500" />
                      )}
                      {activity.type === 'follow' && (
                        <Trophy className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm mb-1">
                        {activity.type === 'discussion' && `Started discussion: ${activity.title}`}
                        {activity.type === 'reply' && `Replied to: ${activity.title}`}
                        {activity.type === 'follow' && `Followed ${activity.targetName}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Discussions Tab */}
          <TabsContent value="discussions" className="space-y-3">
            {!profile.recentDiscussions || profile.recentDiscussions.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No discussions yet
              </Card>
            ) : (
              profile.recentDiscussions.map((discussion: any) => (
                <Card
                  key={discussion.id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setLocation(`/community/${discussion.slug}`)}
                >
                  <h3 className="font-semibold mb-1 hover:text-primary">{discussion.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{discussion.replyCount} replies</span>
                    <span>{discussion.viewCount} views</span>
                    <span>{formatDistanceToNow(new Date(discussion.createdAt), { addSuffix: true })}</span>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about">
            <Card className="p-6 space-y-4">
              {profile.bio && (
                <div>
                  <h3 className="font-semibold mb-2">Bio</h3>
                  <p className="text-muted-foreground">{profile.bio}</p>
                </div>
              )}
              


              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
                </div>
                {profile.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{profile.location}</span>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
