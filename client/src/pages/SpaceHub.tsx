import React, { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  ArrowLeft, MessageSquare, BookOpen, Calendar, Users, Award,
  Clock, Eye, Reply, ChevronRight, Pin, CheckCircle2, ExternalLink,
  TrendingUp, Star, FileText,
} from 'lucide-react';
import { useLocation } from 'wouter';

interface SpaceHubProps {
  categoryId: string;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const POST_TYPE_COLORS: Record<string, string> = {
  question: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  discussion: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  insight: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  announcement: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  case_study: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
};

const POST_TYPE_LABELS: Record<string, string> = {
  question: '❓ Question',
  discussion: '💬 Discussion',
  insight: '💡 Insight',
  announcement: '📢 Announcement',
  case_study: '📋 Case Study',
};

export default function SpaceHub({ categoryId }: SpaceHubProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const catId = parseInt(categoryId);

  const categoriesQuery = trpc.spaces.list.useQuery();
  const contentQuery = trpc.spaces.getContent.useQuery({ categoryId: catId, limit: 20 });
  const contributorsQuery = trpc.spaces.getTopContributors.useQuery({ categoryId: catId, limit: 8 });
  const eventsQuery = trpc.events.list.useQuery({ limit: 10 });
  const category = (categoriesQuery.data || []).find((c: any) => c.id === catId);
  const content = contentQuery.data || { discussions: [], articles: [] };
  const contributors = contributorsQuery.data || [];
  const allEvents = eventsQuery.data || [];

  if (categoriesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center max-w-md">
          <p className="text-lg font-semibold text-foreground mb-4">Space not found</p>
          <Button onClick={() => setLocation('/community')}>Back to Forum</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/community')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          All Spaces
        </Button>
      </div>

      {/* Space Hero */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{category.icon || '📋'}</div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{category.name}</h1>
              {category.description && (
                <p className="text-muted-foreground mt-1 max-w-2xl">{category.description}</p>
              )}
            </div>
          </div>
          {user && (
            <Button
              onClick={() => setLocation('/community')}
              className="shrink-0 gap-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              New Discussion
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { icon: MessageSquare, label: 'Discussions', value: content.discussions.length, color: 'text-blue-400' },
            { icon: BookOpen, label: 'Articles', value: content.articles.length, color: 'text-purple-400' },
            { icon: Users, label: 'Contributors', value: contributors.length, color: 'text-green-400' },
            { icon: TrendingUp, label: 'Active', value: content.discussions.filter((d: any) => {
              const age = Date.now() - new Date(d.createdAt).getTime();
              return age < 7 * 24 * 60 * 60 * 1000;
            }).length, color: 'text-orange-400' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <div>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Tabs */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="discussions">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="discussions" className="gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Discussions
                {content.discussions.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{content.discussions.length}</Badge>
                )}
              </TabsTrigger>

              <TabsTrigger value="members" className="gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Members
              </TabsTrigger>
            </TabsList>

            {/* Discussions Tab */}
            <TabsContent value="discussions" className="space-y-3 mt-4">
              {contentQuery.isLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i} className="p-4 animate-pulse">
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : content.discussions.length === 0 ? (
                <Card className="p-12 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No discussions yet</h3>
                  <p className="text-muted-foreground mb-4">Be the first to start a conversation in this space.</p>
                  {user && (
                    <Button onClick={() => setLocation('/community')}>
                      Start Discussion
                    </Button>
                  )}
                </Card>
              ) : (
                content.discussions.map((discussion: any) => (
                  <Card
                    key={discussion.id}
                    className="p-4 hover:border-primary/40 transition-all cursor-pointer group"
                    onClick={() => setLocation(`/community/${discussion.slug}`)}
                  >
                    <div className="flex gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          {discussion.postType && POST_TYPE_LABELS[discussion.postType] && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${POST_TYPE_COLORS[discussion.postType]}`}>
                              {POST_TYPE_LABELS[discussion.postType]}
                            </span>
                          )}
                          {discussion.acceptedPostId && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Solved
                            </span>
                          )}
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {discussion.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          {discussion.authorName && (
                            <span className="flex items-center gap-1">
                              <Avatar className="h-4 w-4">
                                <AvatarFallback className="text-[8px]">{discussion.authorName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              {discussion.authorName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(new Date(discussion.createdAt))}
                          </span>
                          <span className="flex items-center gap-1">
                            <Reply className="w-3 h-3" />
                            {discussion.replyCount} replies
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 self-center" />
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>



            {/* Members Tab */}
            <TabsContent value="members" className="mt-4">
              {contributors.length === 0 ? (
                <Card className="p-12 text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No contributors yet</h3>
                  <p className="text-muted-foreground">Members who post in this space will appear here.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {contributors.map((member: any, i: number) => (
                    <Card
                      key={member.authorId}
                      className="p-4 hover:border-primary/40 transition-all cursor-pointer"
                      onClick={() => setLocation(`/members/${member.authorId}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>{member.name?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          {i < 3 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <span className="text-[9px] font-bold text-primary-foreground">#{i + 1}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{member.name || 'Member'}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{member.count} posts</span>
                            <span>·</span>
                            <span>{member.reputation || 0} rep</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Top Contributors */}
          {contributors.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-3.5 h-3.5" />
                  Top Contributors
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pb-3">
                {contributors.slice(0, 5).map((member: any, i: number) => (
                  <div
                    key={member.authorId}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setLocation(`/members/${member.authorId}`)}
                  >
                    <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">{member.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{member.name || 'Member'}</p>
                      <p className="text-[10px] text-muted-foreground">{member.count} posts</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Related Spaces */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Other Spaces
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-3">
              {(categoriesQuery.data || [])
                .filter((c: any) => c.id !== catId && c.parentId === 0)
                .slice(0, 6)
                .map((cat: any) => (
                  <button
                    key={cat.id}
                    onClick={() => setLocation(`/spaces/${cat.id}`)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                  >
                    <span className="text-base">{cat.icon || '📋'}</span>
                    <span className="truncate text-foreground">{cat.name}</span>
                  </button>
                ))}
              <div className="px-4 pt-1">
                <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setLocation('/community')}>
                  View All Spaces →
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
