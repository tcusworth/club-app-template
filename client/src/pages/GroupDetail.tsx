import { useState } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Users, MessageSquare, Bell, ArrowLeft, Lock, Globe, EyeOff,
  Crown, Shield, UserPlus, UserMinus, Check, X, Clock
} from "lucide-react";

export default function GroupDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: group, isLoading } = trpc.forum.getGroupBySlug.useQuery(
    { slug: slug! },
    { enabled: !!slug }
  );

  const { data: members = [] } = trpc.forum.getGroupMembers.useQuery(
    { groupId: group?.id ?? 0 },
    { enabled: !!group?.id }
  );

  const { data: discussions = [] } = trpc.forum.getGroupDiscussions.useQuery(
    { groupId: group?.id ?? 0, limit: 20 },
    { enabled: !!group?.id }
  );

  const { data: announcements = [] } = trpc.forum.getGroupAnnouncements.useQuery(
    { groupId: group?.id ?? 0 },
    { enabled: !!group?.id }
  );

  const joinGroup = trpc.forum.joinGroup.useMutation({
    onSuccess: (result: any) => {
      utils.forum.getGroupBySlug.invalidate();
      utils.forum.getGroupMembers.invalidate();
      if (result?.requiresApproval) {
        toast.success(result.alreadyRequested ? "Your request is already pending approval." : "Request sent — a group admin will need to approve it.");
      } else {
        toast.success("Joined group!");
      }
    },
  });

  const isMember = members.some((m: any) => m.userId === user?.id);
  const isAdmin = members.some((m: any) => m.userId === user?.id && m.role === "admin");
  const isModerator = members.some((m: any) => m.userId === user?.id && m.role === "moderator");
  const canManageRequests = isAdmin || isModerator;

  const { data: pendingRequests = [], refetch: refetchPendingRequests } = trpc.forum.getPendingJoinRequests.useQuery(
    { groupId: group?.id ?? 0 },
    { enabled: !!group?.id && canManageRequests && group?.visibility !== "public" }
  );

  const respondToRequest = trpc.forum.respondToJoinRequest.useMutation({
    onSuccess: () => {
      refetchPendingRequests();
      utils.forum.getGroupBySlug.invalidate();
      utils.forum.getGroupMembers.invalidate();
      toast.success("Request updated.");
    },
    onError: (err: any) => toast.error(err?.message ?? "Couldn't update that request."),
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <div className="h-40 bg-muted animate-pulse rounded-xl" />
          <div className="h-64 bg-muted animate-pulse rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!group) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground">Group not found</p>
          <Button variant="ghost" className="mt-4 gap-1" onClick={() => navigate("/groups")}>
            <ArrowLeft className="w-4 h-4" /> Back to Groups
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Back */}
        <button
          onClick={() => navigate("/groups")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> All Groups
        </button>

        {/* Group Header */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {group.visibility === "secret" ? (
                  <Badge variant="outline" className="gap-1 text-xs"><EyeOff className="w-3 h-3" /> Secret</Badge>
                ) : group.visibility === "private" ? (
                  <Badge variant="outline" className="gap-1 text-xs"><Lock className="w-3 h-3" /> Private</Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-xs"><Globe className="w-3 h-3" /> Public</Badge>
                )}
              </div>
              <h1 className="text-xl font-bold text-foreground">{group.name}</h1>
              {group.description && (
                <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
              )}
            </div>
            {user && !isMember && (
              <Button
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => joinGroup.mutate({ groupId: group.id })}
                disabled={joinGroup.isPending}
              >
                <UserPlus className="w-4 h-4" />
                {group.visibility !== "public" ? "Request to Join" : "Join Group"}
              </Button>
            )}
            {isMember && (
              <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
                <Users className="w-3 h-3" /> Member
              </Badge>
            )}
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {group.memberCount} members</span>
            <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {discussions.length} discussions</span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="discussions">
          <TabsList>
            <TabsTrigger value="discussions" className="gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> Discussions
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-1.5">
              <Users className="w-3.5 h-3.5" /> Members ({members.length})
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-1.5">
              <Bell className="w-3.5 h-3.5" /> Announcements
            </TabsTrigger>
            {canManageRequests && group.visibility !== "public" && (
              <TabsTrigger value="requests" className="gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Requests
                {pendingRequests.length > 0 && (
                  <Badge className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground">
                    {pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="discussions" className="mt-3 space-y-2">
            {discussions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No discussions yet in this group.</p>
              </div>
            ) : (
              discussions.map((d: any) => (
                <div
                  key={d.id}
                  className="bg-card border border-border rounded-lg p-3 hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => navigate(`/community/${d.slug}`)}
                >
                  <h3 className="font-medium text-foreground text-sm">{d.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                    <span>{d.replyCount ?? 0} replies</span>
                    <span>{d.viewCount ?? 0} views</span>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="members" className="mt-3 space-y-2">
            {members.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {(m.user?.name ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{m.user?.name ?? "Member"}</p>
                  <p className="text-xs text-muted-foreground">Joined {new Date(m.joinedAt).toLocaleDateString()}</p>
                </div>
                {m.role === "admin" && (
                  <Badge className="gap-1 text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                    <Crown className="w-3 h-3" /> Admin
                  </Badge>
                )}
                {m.role === "moderator" && (
                  <Badge className="gap-1 text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                    <Shield className="w-3 h-3" /> Mod
                  </Badge>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="announcements" className="mt-3 space-y-2">
            {announcements.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No announcements yet.</p>
              </div>
            ) : (
              announcements.map((a: any) => (
                <div key={a.id} className="bg-card border border-border rounded-lg p-4 space-y-1">
                  {a.isPinned && (
                    <Badge className="text-xs bg-primary/10 text-primary border-primary/20 mb-1">Pinned</Badge>
                  )}
                  <h3 className="font-semibold text-foreground text-sm">{a.title}</h3>
                  <p className="text-sm text-muted-foreground">{a.content}</p>
                  <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </TabsContent>

          {canManageRequests && group.visibility !== "public" && (
            <TabsContent value="requests" className="mt-3 space-y-2">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No pending join requests.</p>
                </div>
              ) : (
                pendingRequests.map((r: any) => (
                  <div key={r.request.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {(r.user?.name ?? "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{r.user?.name ?? "Member"}</p>
                      <p className="text-xs text-muted-foreground">
                        Requested {new Date(r.request.createdAt).toLocaleDateString()}
                        {r.request.message ? ` — "${r.request.message}"` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={respondToRequest.isPending}
                      onClick={() => respondToRequest.mutate({ requestId: r.request.id, approve: true })}
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-muted-foreground"
                      disabled={respondToRequest.isPending}
                      onClick={() => respondToRequest.mutate({ requestId: r.request.id, approve: false })}
                    >
                      <X className="w-3.5 h-3.5" /> Decline
                    </Button>
                  </div>
                ))
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
