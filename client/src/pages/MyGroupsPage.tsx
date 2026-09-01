import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, Lock, Globe, Plus, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function MyGroupsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const { data: myGroups, isLoading } = trpc.myGroups.list.useQuery(undefined, { enabled: !!user });

  const filtered = (myGroups ?? []).filter((item: any) => {
    if (!search) return true;
    const g = item.group;
    return (g.name || "").toLowerCase().includes(search.toLowerCase()) ||
           (g.description || "").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Groups</h1>
            <p className="text-sm text-muted-foreground">Groups you've joined</p>
          </div>
        </div>
        <Button onClick={() => navigate("/community")} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" /> Browse Groups
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search your groups..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-36 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">{search ? "No groups match your search" : "You haven't joined any groups yet"}</p>
          {!search && (
            <Button className="mt-4" onClick={() => navigate("/community")}>
              Browse Groups <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item: any) => {
            const g = item.group;
            const m = item.membership;
            return (
              <Card key={g.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/community`)}>
                <div className="h-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-t-lg flex items-center justify-center">
                  <Users className="h-8 w-8 text-primary/30" />
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{g.name}</CardTitle>
                    <div className="flex items-center gap-1 shrink-0">
                      {g.isPrivate ? (
                        <Badge variant="outline" className="text-xs"><Lock className="h-2.5 w-2.5 mr-1" />Private</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs"><Globe className="h-2.5 w-2.5 mr-1" />Public</Badge>
                      )}
                      {m.role === "admin" && <Badge className="text-xs">Admin</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground line-clamp-2">{g.description || "No description"}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{g.memberCount ?? 0} members</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
