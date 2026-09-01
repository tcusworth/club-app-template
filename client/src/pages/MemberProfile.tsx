import React, { useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { StatStrip } from '@/components/dashboard/StatStrip';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { CATEGORY_COLORS, CATEGORY_HUES, hueFor, colorsFor } from '@/lib/categoryColors';
import {
  UserPlus, UserMinus, MessageCircle, MapPin, Building2, Link2,
  Award, TrendingUp, Users, MessageSquare, Activity, Star, Shield,
  CheckCircle, Linkedin, BookOpen, Layers, PenLine, ArrowRight, Globe, ChevronRight,
  Hash, ExternalLink, BarChart2, Crown, Zap,
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  owner_operator: 'Owner/Operator',
  epc_integrator: 'EPC/Integrator',
  automation_engineer: 'Automation Engineer',
  executive: 'Executive',
  vendor: 'Vendor',
  analyst: 'Analyst/Researcher',
};

const ROLE_COLORS: Record<string, string> = {
  owner_operator: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  epc_integrator: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  automation_engineer: 'bg-green-500/20 text-green-400 border-green-500/30',
  executive: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  vendor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  analyst: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

const getMemberTier = (reputation: number) => {
  if (reputation >= 500) return { name: 'Expert', icon: Crown, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
  if (reputation >= 250) return { name: 'Contributor', icon: Star, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
  if (reputation >= 100) return { name: 'Active', icon: Zap, color: 'bg-green-500/20 text-green-400 border-green-500/30' };
  return null;
};

const BADGE_ICONS: Record<string, string> = {
  verified: '✓',
  first_discussion: '💬',
  first_post: '📝',
  active_member: '⚡',
  group_leader: '👑',
  expert: '🎓',
  trusted_member: '🛡️',
  community_champion: '🏆',
};

// ─── Space Hover Preview Card ─────────────────────────────────────────────────

function SpaceHoverCard({ space }: { space: any }) {
  const [open, setOpen] = useState(false);
  const previewQuery = trpc.spaces.getPreview.useQuery(
    { categoryId: space.id },
    { enabled: open, staleTime: 60_000 }
  );
  const preview = previewQuery.data;

  return (
    <HoverCard openDelay={200} closeDelay={100} onOpenChange={setOpen}>
      <HoverCardTrigger asChild>
        <Link href={`/spaces/${space.slug ?? space.id}`}>
          <Card className="p-4 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full group">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                  {space.name}
                </p>
                {space.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{space.description}</p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-1.5 flex items-center gap-1">
                  <ExternalLink className="w-2.5 h-2.5" />
                  Hover for preview
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </HoverCardTrigger>

      <HoverCardContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-80 p-0 overflow-hidden border border-border/80 shadow-xl"
      >
        {/* Popover header */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 px-4 py-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground line-clamp-1">{space.name}</p>
              {space.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{space.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="px-4 py-2.5 border-b border-border/40 bg-muted/30">
          {previewQuery.isLoading ? (
            <div className="flex gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          ) : (
            <div className="flex items-center gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary/70" />
                <strong className="text-foreground">{preview?.memberCount ?? 0}</strong> contributors
              </span>
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-primary/70" />
                <strong className="text-foreground">{preview?.discussionCount ?? 0}</strong> discussions
              </span>
            </div>
          )}
        </div>

        {/* Recent discussions */}
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Recent Discussions
          </p>
          {previewQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : preview?.recentDiscussions && preview.recentDiscussions.length > 0 ? (
            <div className="space-y-1.5">
              {preview.recentDiscussions.map((d: any) => (
                <div key={d.id} className="flex items-start gap-2 group/item">
                  <Hash className="w-3 h-3 text-muted-foreground/50 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground line-clamp-1 group-hover/item:text-primary transition-colors">
                      {d.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">
                      {d.replyCount ?? 0} replies · {new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No discussions yet — be the first!</p>
          )}
        </div>

        {/* CTA footer */}
        <div className="px-4 py-2.5 border-t border-border/40 bg-muted/20">
          <Link href={`/spaces/${space.slug ?? space.id}`}>
            <Button size="sm" variant="default" className="w-full h-7 text-xs gap-1.5">
              <ExternalLink className="w-3 h-3" />
              Open Space
            </Button>
          </Link>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface MemberProfileProps {
  userId: number;
}

export default function MemberProfile({ userId }: MemberProfileProps) {
  const { user: currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);

  const memberQuery = trpc.user.getById.useQuery({ id: userId });
  const badgesQuery = trpc.gamification.getUserBadges.useQuery({ userId });
  const pointsQuery = trpc.gamification.getUserPoints.useQuery({ userId });
  const followersQuery = trpc.social.getFollowers.useQuery({ userId, limit: 50 });
  const followingQuery = trpc.social.getFollowing.useQuery({ userId, limit: 50 });
  const activityQuery = trpc.activity.getUserActivityFeed.useQuery({ userId, limit: 20 });

  // Profile tab data
  const discussionsQuery = trpc.profile.getDiscussions.useQuery({ userId, limit: 20 });
  const articlesQuery = trpc.profile.getArticles.useQuery({ userId, limit: 20 });
  const blogPostsQuery = trpc.profile.getBlogPosts.useQuery({ userId, limit: 20 });
  const spacesFollowedQuery = trpc.profile.getSpacesFollowed.useQuery({ userId });

  const followMutation = trpc.social.followMember.useMutation({
    onSuccess: () => {
      setIsFollowing(true);
      toast.success('Now following this member');
      followersQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const unfollowMutation = trpc.social.unfollowMember.useMutation({
    onSuccess: () => {
      setIsFollowing(false);
      toast.success('Unfollowed member');
      followersQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const member = memberQuery.data;
  const badges = badgesQuery.data || [];
  const points = pointsQuery.data;
  const followers = followersQuery.data || [];
  const following = followingQuery.data || [];
  const activityItems = activityQuery.data || [];
  const profileDiscussions = (discussionsQuery.data ?? []) as any[];
  const profileArticles = (articlesQuery.data ?? []) as any[];
  const profileBlogPosts = (blogPostsQuery.data ?? []) as any[];
  const spacesFollowed = (spacesFollowedQuery.data ?? []) as any[];

  if (memberQuery.isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-muted rounded-xl" />
        <div className="flex gap-4">
          <div className="w-24 h-24 rounded-full bg-muted" />
          <div className="flex-1 space-y-3">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <Card className="p-12 text-center">
        <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Member not found</h3>
        <Link href="/members">
          <Button variant="outline">Back to Directory</Button>
        </Link>
      </Card>
    );
  }

  const initials = member.name
    ? member.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';
  const roleColor = (member as any).platformRole ? ROLE_COLORS[(member as any).platformRole] || 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground';
  const roleLabel = (member as any).platformRole ? ROLE_LABELS[(member as any).platformRole] || (member as any).platformRole : 'Member';
  const isOwnProfile = currentUser?.id === userId;
  const verificationStatus = (member as any)?.verificationStatus as string | undefined;
  const expertiseAreas: string[] = (() => {
    try { return JSON.parse((member as any)?.expertiseAreas || '[]'); } catch { return []; }
  })();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {isOwnProfile ? (
        <>
          {/* My Profile header card */}
          <div className="opa-card flex flex-wrap items-center gap-4 rounded-lg border bg-card p-5">
            <Avatar className="h-[72px] w-[72px] shrink-0">
              <AvatarFallback
                className="font-heading text-[26px] font-semibold text-white"
                style={{ background: "linear-gradient(135deg, var(--category-violet-solid), var(--category-blue-solid))" }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-heading text-[26px] font-semibold leading-tight">{member.name || 'Anonymous'}</h1>
                <VerifiedBadge status={verificationStatus} size="md" showPending={isOwnProfile} />
              </div>
              <p className="text-[14.5px] text-muted-foreground mt-0.5">
                {roleLabel}{(member as any).organization ? `, ${(member as any).organization}` : ''}
              </p>
              {(member as any).bio && (
                <p className="text-sm text-muted-foreground mt-2 max-w-[60ch] leading-relaxed">{(member as any).bio}</p>
              )}
            </div>
            <Link href="/settings">
              <Button variant="outline" className="shrink-0">Edit Profile</Button>
            </Link>
          </div>

          {/* Stat strip */}
          <StatStrip
            items={[
              { icon: TrendingUp, value: member.reputationScore || 0, label: 'Reputation', hue: 'violet' },
              { icon: MessageSquare, value: profileDiscussions.length, label: 'Discussions Started', hue: 'blue' },
              { icon: Award, value: badges.length, label: 'Badges Earned', hue: 'amber' },
            ]}
          />

          {/* Recent Activity (main) + Badges / Expertise (rail) */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 min-w-0 space-y-3">
              <h3 className="font-heading text-[19px] font-semibold">Recent Activity</h3>
              {activityItems.length === 0 ? (
                <div className="opa-card rounded-lg border bg-card p-8 text-center">
                  <Activity className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activityItems.slice(0, 6).map((item: any, i: number) => {
                    const dotColor = CATEGORY_COLORS[CATEGORY_HUES[i % CATEGORY_HUES.length]].solid;
                    return (
                      <div key={item.id} className="opa-card flex items-start gap-3 rounded-md border bg-card p-3">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: dotColor }} />
                        <div>
                          <p className="text-[14.5px] leading-snug">{item.description || item.activityType.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{new Date(item.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right rail */}
            <div className="w-full lg:w-[300px] lg:shrink-0 flex flex-col gap-4">
              <SectionCard title="Badges">
                {badges.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">No badges yet</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3 p-1">
                    {badges.map((badge: any) => {
                      const colors = CATEGORY_COLORS[hueFor(badge.badgeType || badge.id)];
                      return (
                        <div key={badge.id} className="flex flex-col items-center gap-1 text-center" title={badge.description || badge.title}>
                          <div
                            className="flex h-11 w-11 items-center justify-center rounded-full text-lg"
                            style={{ background: colors.bg, color: colors.text }}
                          >
                            {BADGE_ICONS[badge.badgeType] || '🏅'}
                          </div>
                          <span className="text-[10.5px] text-muted-foreground leading-tight">{badge.title}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Expertise">
                {expertiseAreas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">No expertise tags yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2 p-1">
                    {expertiseAreas.map((area: string) => {
                      const colors = colorsFor(area);
                      return (
                        <span
                          key={area}
                          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                          style={{ background: colors.bg, color: colors.text }}
                        >
                          #{area}
                        </span>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Cover Photo + Avatar */}
          <div className="relative">
            {/* Cover */}
            <div className="h-48 rounded-xl bg-gradient-to-br from-primary/30 via-primary/10 to-background border border-border overflow-hidden">
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(var(--primary)) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(var(--primary)) 0%, transparent 40%)' }}
              />
            </div>

            {/* Avatar overlapping cover */}
            <div className="absolute -bottom-12 left-6">
              <Avatar className="h-24 w-24 ring-4 ring-background shadow-xl">
                <AvatarFallback className="text-3xl font-bold bg-primary/20 text-primary">{initials}</AvatarFallback>
              </Avatar>
            </div>

            {/* Action buttons */}
            {!isOwnProfile && currentUser && (
              <div className="absolute bottom-4 right-4 flex gap-2">
                <Button
                  size="sm"
                  variant={isFollowing ? 'outline' : 'default'}
                  onClick={() => isFollowing
                    ? unfollowMutation.mutate({ followingId: userId })
                    : followMutation.mutate({ followingId: userId })
                  }
                  disabled={followMutation.isPending || unfollowMutation.isPending}
                >
                  {isFollowing ? (
                    <><UserMinus className="w-3.5 h-3.5 mr-1.5" />Unfollow</>
                  ) : (
                    <><UserPlus className="w-3.5 h-3.5 mr-1.5" />Follow</>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="pt-10 px-2">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-foreground">{member.name || 'Anonymous'}</h1>
                  <VerifiedBadge status={verificationStatus} size="md" showPending={isOwnProfile} />
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${roleColor}`}>
                    {roleLabel}
                  </span>
                  {(member as any).organization && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {(member as any).organization}
                    </span>
                  )}
                  {(member as any).linkedInUrl && (
                    <a href={(member as any).linkedInUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors">
                      <Linkedin className="w-3.5 h-3.5" />
                      LinkedIn
                    </a>
                  )}
                </div>
                {(member as any).bio && (
                  <p className="text-sm text-muted-foreground mt-3 max-w-xl">{(member as any).bio}</p>
                )}
                {expertiseAreas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {expertiseAreas.map((area: string) => (
                      <span key={area} className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                        {area}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Tier Badge */}
              {getMemberTier(member.reputationScore || 0) && (() => {
                const tier = getMemberTier(member.reputationScore || 0);
                const TierIcon = tier!.icon;
                return (
                  <Badge className={`gap-1.5 w-fit ${tier!.color}`}>
                    <TierIcon className="w-3 h-3" />
                    {tier!.name}
                  </Badge>
                );
              })()}

              {/* Stats */}
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{member.reputationScore || 0}</p>
                  <p className="text-xs text-muted-foreground">Points</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{followers.length}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{following.length}</p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </div>
              </div>
            </div>
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Badges
              </h3>
              <div className="flex flex-wrap gap-2">
                {badges.map((badge: any) => (
                  <div
                    key={badge.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20"
                    title={badge.description || badge.title}
                  >
                    <span className="text-sm">{BADGE_ICONS[badge.badgeType] || '🏅'}</span>
                    <span className="text-xs font-medium text-primary">{badge.title}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Tabs: Contributions, Articles, Spaces, Activity, Followers, Following */}
      <Tabs defaultValue="contributions">
        <TabsList className="flex w-full overflow-x-auto h-auto p-1 gap-0.5">
          <TabsTrigger value="contributions" className="gap-1.5 text-xs flex-1 min-w-[90px]">
            <MessageSquare className="w-3.5 h-3.5" />
            Contributions
          </TabsTrigger>
          <TabsTrigger value="articles" className="gap-1.5 text-xs flex-1 min-w-[70px]">
            <BookOpen className="w-3.5 h-3.5" />
            Articles
          </TabsTrigger>
          <TabsTrigger value="spaces" className="gap-1.5 text-xs flex-1 min-w-[70px]">
            <Layers className="w-3.5 h-3.5" />
            Spaces
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5 text-xs flex-1 min-w-[70px]">
            <Activity className="w-3.5 h-3.5" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="followers" className="gap-1.5 text-xs flex-1 min-w-[80px]">
            <Users className="w-3.5 h-3.5" />
            Followers ({followers.length})
          </TabsTrigger>
          <TabsTrigger value="following" className="gap-1.5 text-xs flex-1 min-w-[80px]">
            <UserPlus className="w-3.5 h-3.5" />
            Following ({following.length})
          </TabsTrigger>
        </TabsList>

        {/* Contributions: forum discussions + blog posts */}
        <TabsContent value="contributions" className="mt-4 space-y-3">
          {profileDiscussions.length === 0 && profileBlogPosts.length === 0 ? (
            <Card className="p-8 text-center">
              <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No contributions yet</p>
            </Card>
          ) : (
            <>
              {profileDiscussions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Forum Discussions</p>
                  {profileDiscussions.map((d: any) => (
                    <Link key={d.id} href={`/community/${d.slug}`}>
                      <Card className="p-3.5 hover:border-primary/40 transition-colors cursor-pointer">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-1">{d.title}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {d.replyCount ?? 0} replies</span>
                              <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
              {profileBlogPosts.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Blog Posts</p>
                  {profileBlogPosts.map((p: any) => (
                    <Link key={p.id} href={`/blog/${p.slug}`}>
                      <Card className="p-3.5 hover:border-primary/40 transition-colors cursor-pointer">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-1">{p.title}</p>
                            {p.excerpt && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.excerpt}</p>}
                            <p className="text-xs text-muted-foreground mt-1">{new Date(p.publishedAt || p.createdAt).toLocaleDateString()}</p>
                          </div>
                          <PenLine className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>



        {/* Spaces Followed — with hover-to-preview */}
        <TabsContent value="spaces" className="mt-4 space-y-3">
          {spacesFollowed.length === 0 ? (
            <Card className="p-8 text-center">
              <Layers className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Not following any spaces yet</p>
            </Card>
          ) : (
            <>
              <p className="text-xs text-muted-foreground px-1">
                Hover over a space card to preview recent activity before navigating.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {spacesFollowed.map((space: any) => (
                  <SpaceHoverCard key={space.id} space={space} />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity" className="mt-4 space-y-3">
          {activityItems.length === 0 ? (
            <Card className="p-8 text-center">
              <Activity className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No activity yet</p>
            </Card>
          ) : (
            activityItems.map((item: any) => (
              <Card key={item.id} className="p-4">
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground">{item.description || item.activityType.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Followers */}
        <TabsContent value="followers" className="mt-4">
          <MemberList members={followers} label="followers" />
        </TabsContent>

        {/* Following */}
        <TabsContent value="following" className="mt-4">
          <MemberList members={following} label="following" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MemberList({ members, label }: { members: any[]; label: string }) {
  if (members.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No {label} yet</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {members.map((m: any) => (
        <Link key={m.id} href={`/members/${m.id}`}>
          <Card className="p-4 hover:border-primary/40 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="font-semibold">{m.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{m.name || 'Anonymous'}</p>
                <p className="text-xs text-muted-foreground">{m.reputationScore || 0} pts</p>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
