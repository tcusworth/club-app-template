import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell, MessageSquare, Users, AtSign, Trophy, BookOpen,
  CheckCheck, Circle, Clock, Mail, ShieldCheck
} from "lucide-react";

const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
  reply: { icon: MessageSquare, color: "text-blue-500 bg-blue-500/10", label: "Replied to your discussion" },
  mention: { icon: AtSign, color: "text-purple-500 bg-purple-500/10", label: "Mentioned you" },
  message: { icon: MessageSquare, color: "text-emerald-500 bg-emerald-500/10", label: "Sent you a message" },
  group_invite: { icon: Users, color: "text-amber-500 bg-amber-500/10", label: "Invited you to a group" },
  badge_earned: { icon: Trophy, color: "text-yellow-500 bg-yellow-500/10", label: "You earned a badge" },
  content_published: { icon: BookOpen, color: "text-indigo-500 bg-indigo-500/10", label: "Published new content" },
  group_joined: { icon: Users, color: "text-teal-500 bg-teal-500/10", label: "Joined your group" },
  member_followed: { icon: Users, color: "text-pink-500 bg-pink-500/10", label: "Started following you" },
  verification: { icon: ShieldCheck, color: "text-emerald-500 bg-emerald-500/10", label: "Expert verification update" },
  digest: { icon: Mail, color: "text-blue-600 bg-blue-600/10", label: "Weekly Community Digest" },
  system: { icon: Bell, color: "text-slate-500 bg-slate-500/10", label: "System Notification" },
};

function timeAgo(date: Date | string) {
  const d = new Date(date);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Notifications() {
  const utils = trpc.useUtils();
  const { data: allNotifs = [], isLoading } = trpc.notifications.list.useQuery({ unreadOnly: false });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });
  const markAllRead = trpc.notifications.markAllRead.useQuery(undefined, { enabled: false });

  const unread = allNotifs.filter((n: any) => !n.isRead);
  const read = allNotifs.filter((n: any) => n.isRead);

  const handleMarkAllRead = async () => {
    for (const n of unread) {
      await markRead.mutateAsync({ id: n.id });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
            {unread.length > 0 && (
              <Badge className="bg-primary text-primary-foreground text-xs">{unread.length}</Badge>
            )}
          </div>
          {unread.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        <Tabs defaultValue="all">
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              All
              {allNotifs.length > 0 && <span className="ml-1.5 text-muted-foreground text-xs">({allNotifs.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="unread" className="flex-1">
              Unread
              {unread.length > 0 && <Badge className="ml-1.5 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground">{unread.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-3 space-y-1">
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : allNotifs.length === 0 ? (
              <EmptyState />
            ) : (
              allNotifs.map((n: any) => (
                <NotificationItem key={n.id} notif={n} onMarkRead={() => markRead.mutate({ id: n.id })} />
              ))
            )}
          </TabsContent>

          <TabsContent value="unread" className="mt-3 space-y-1">
            {unread.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">You're all caught up!</p>
              </div>
            ) : (
              unread.map((n: any) => (
                <NotificationItem key={n.id} notif={n} onMarkRead={() => markRead.mutate({ id: n.id })} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function NotificationItem({ notif, onMarkRead }: { notif: any; onMarkRead: () => void }) {
  const config = typeConfig[notif.type] ?? { icon: Bell, color: "text-muted-foreground bg-muted", label: notif.type };
  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer group ${
        !notif.isRead ? "bg-primary/5 hover:bg-primary/10 border border-primary/10" : "hover:bg-accent"
      }`}
      onClick={!notif.isRead ? onMarkRead : undefined}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">
          <span className="font-medium">{notif.title || config.label}</span>
        </p>
        {notif.content && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 whitespace-pre-line">{notif.content}</p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{timeAgo(notif.createdAt)}</span>
        </div>
      </div>
      {!notif.isRead && (
        <Circle className="w-2 h-2 fill-primary text-primary shrink-0 mt-1.5" />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-medium text-foreground">No notifications yet</p>
      <p className="text-sm mt-1">When someone replies to your posts or mentions you, it'll show up here.</p>
    </div>
  );
}
