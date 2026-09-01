import React from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { hueFor, CATEGORY_COLORS } from '@/lib/categoryColors';

const ACTIVITY_LABELS: Record<string, string> = {
  discussion_created: 'started a discussion',
  post_created: 'replied to a discussion',
  group_joined: 'joined a group',
  member_followed: 'followed a member',
  badge_earned: 'earned a badge',
  content_published: 'published an article',
  group_created: 'created a group',
};

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export default function ActivityFeed() {
  const feedQuery = trpc.activity.getActivityFeed.useQuery({ limit: 50 });
  const activities = feedQuery.data || [];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Activity className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Activity Feed</h1>
          <p className="text-muted-foreground text-sm">Latest community activity</p>
        </div>
      </div>

      {/* Feed */}
      {feedQuery.isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <Card className="p-12 text-center">
          <Activity className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No activity yet</h3>
          <p className="text-muted-foreground">
            Start contributing to see activity here. Join discussions, create groups, or follow members.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link href="/dashboard">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                Go to Forum
              </button>
            </Link>
            <Link href="/members">
              <button className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted transition-colors">
                Find Members
              </button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="opa-card relative rounded-lg border bg-card p-5">
          <div className="absolute left-[26px] top-8 bottom-8 w-px bg-border" />
          <div className="flex flex-col">
            {activities.map((activity) => {
              const label = ACTIVITY_LABELS[activity.activityType] || activity.activityType.replace(/_/g, ' ');
              const dotColor = CATEGORY_COLORS[hueFor(activity.activityType)].solid;

              return (
                <div key={activity.id} className="relative flex gap-3 py-2">
                  <div
                    className="relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-card"
                    style={{ background: dotColor }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] leading-snug">
                      <Link href={`/members/${activity.userId}`}>
                        <span className="font-semibold text-foreground hover:text-primary cursor-pointer">
                          Member #{activity.userId}
                        </span>
                      </Link>{' '}
                      <span className="text-muted-foreground">{label}</span>
                    </p>
                    {activity.description && (
                      <p className="text-sm text-foreground mt-0.5 line-clamp-2">{activity.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {timeAgo(new Date(activity.createdAt))}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
