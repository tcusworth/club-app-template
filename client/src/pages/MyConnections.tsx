import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { hueFor, CATEGORY_COLORS } from "@/lib/categoryColors";
import { Users, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const ROLE_LABELS: Record<string, string> = {
  owner_operator: "Owner/Operator",
  epc_integrator: "EPC/Integrator",
  automation_engineer: "Automation Engineer",
  executive: "Executive",
  vendor: "Vendor",
  analyst: "Analyst/Researcher",
  admin: "Admin",
  user: "Member",
};

function MemberCard({ user, isFollowing, onUnfollow }: { user: any; isFollowing: boolean; onUnfollow?: () => void }) {
  const [, navigate] = useLocation();
  const initials = (user.name || user.email || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const avatarColor = CATEGORY_COLORS[hueFor(user.id ?? user.name ?? user.email)].solid;
  return (
    <div className="opa-card flex items-center gap-3 rounded-lg border bg-card p-4">
      <Avatar className="h-11 w-11 shrink-0 cursor-pointer" onClick={() => navigate(`/members/${user.id}`)}>
        <AvatarFallback className="font-heading font-semibold text-[15px] text-white" style={{ background: avatarColor }}>
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/members/${user.id}`)}>
        <p className="font-semibold text-[15px] text-foreground truncate">{user.name || user.email}</p>
        <p className="text-[13px] text-muted-foreground mt-0.5">{ROLE_LABELS[user.role] ?? user.role}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!isFollowing && (
          <Badge variant="secondary" className="text-[11px]">Follows you</Badge>
        )}
        {isFollowing && onUnfollow && (
          <Button size="sm" variant="ghost" onClick={onUnfollow} className="text-[13px]">
            Unfollow
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => navigate('/messages')} className="text-[13px]">
          Message
        </Button>
      </div>
    </div>
  );
}

export default function MyConnections() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();

  const { data: connections, isLoading: loadingConn } = trpc.connections.myConnections.useQuery(undefined, { enabled: !!user });
  const { data: followers, isLoading: loadingFoll } = trpc.connections.myFollowers.useQuery(undefined, { enabled: !!user });

  const unfollowMutation = trpc.connections.unfollow.useMutation({
    onSuccess: () => { toast.success("Unfollowed"); utils.connections.myConnections.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const filterList = (list: any[]) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((item: any) => {
      const u = item.user;
      return (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
    });
  };

  const filteredConnections = filterList(connections ?? []);
  const filteredFollowers = filterList(followers ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[34px] font-semibold leading-tight">My Connections</h1>
        <p className="text-[15.5px] text-muted-foreground mt-1.5">People you follow and your followers</p>
      </div>

      <StatStrip
        items={[
          { icon: Users, value: connections?.length ?? 0, label: 'Connections', hue: 'blue' },
          { icon: UserPlus, value: followers?.length ?? 0, label: 'Followers', hue: 'coral' },
        ]}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search connections..." className="pl-9 h-10 bg-card border-border/70" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Tabs defaultValue="following">
        <TabsList>
          <TabsTrigger value="following">
            Following {connections ? `(${connections.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="followers">
            Followers {followers ? `(${followers.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="following" className="mt-4">
          {loadingConn ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-[76px] bg-muted animate-pulse rounded-lg" />)}</div>
          ) : filteredConnections.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">{search ? "No matches" : "Not following anyone yet"}</p>
              <p className="text-sm mt-1">{!search && "Visit the Member Directory to find and follow members."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredConnections.map((item: any) => (
                <MemberCard
                  key={item.follow.id}
                  user={item.user}
                  isFollowing={true}
                  onUnfollow={() => unfollowMutation.mutate({ targetId: item.user.id })}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="followers" className="mt-4">
          {loadingFoll ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-[76px] bg-muted animate-pulse rounded-lg" />)}</div>
          ) : filteredFollowers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">{search ? "No matches" : "No followers yet"}</p>
              <p className="text-sm mt-1">{!search && "Share your profile to grow your network."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredFollowers.map((item: any) => (
                <MemberCard key={item.follow.id} user={item.user} isFollowing={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
