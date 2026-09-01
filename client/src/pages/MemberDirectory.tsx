import React, { useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import SectionHeroBanner from '@/components/SectionHeroBanner';
import { trpc } from '@/lib/trpc';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Users, Award } from 'lucide-react';
import { toast } from 'sonner';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { StatStrip } from '@/components/dashboard/StatStrip';
import { CategoryPill } from '@/components/dashboard/ListCard';
import { hueFor, CATEGORY_COLORS } from '@/lib/categoryColors';

const ROLE_LABELS: Record<string, string> = {
  owner_operator: 'Owner/Operator',
  epc_integrator: 'EPC/Integrator',
  automation_engineer: 'Automation Engineer',
  executive: 'Executive',
  vendor: 'Vendor',
  analyst: 'Analyst/Researcher',
};

export default function MemberDirectory() {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [activeSearch, setActiveSearch] = useState('');

  const trendingQuery = trpc.directory.getTrendingMembers.useQuery({ limit: 50 });
  const searchResultsQuery = trpc.directory.searchMembers.useQuery(
    { query: activeSearch, limit: 50 },
    { enabled: activeSearch.length > 0 }
  );
  const byRoleQuery = trpc.directory.getMembersByRole.useQuery(
    { platformRole: selectedRole, limit: 50 },
    { enabled: selectedRole !== 'all' && activeSearch.length === 0 }
  );

  const followMutation = trpc.social.followMember.useMutation({
    onSuccess: () => toast.success('Now following this member'),
    onError: (e) => toast.error(e.message),
  });

  const handleSearch = () => {
    setActiveSearch(searchQuery);
    setSelectedRole('all');
  };

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    setActiveSearch('');
    setSearchQuery('');
  };

  const members = activeSearch
    ? (searchResultsQuery.data || [])
    : selectedRole !== 'all'
    ? (byRoleQuery.data || [])
    : (trendingQuery.data || []);

  const isLoading = activeSearch
    ? searchResultsQuery.isLoading
    : selectedRole !== 'all'
    ? byRoleQuery.isLoading
    : trendingQuery.isLoading;

  const verifiedCount = (trendingQuery.data ?? []).filter((m) => m.verificationStatus === 'verified').length;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <SectionHeroBanner sectionKey="members" />
      {/* Header */}
      <div>
        <h1 className="font-heading text-[34px] font-semibold leading-tight">Member Directory</h1>
        <p className="text-[15.5px] text-muted-foreground mt-1.5">Connect with OPA community members</p>
      </div>

      {/* Stats */}
      <StatStrip
        items={[
          { icon: Users, value: trendingQuery.data?.length ?? 0, label: 'Members', hue: 'blue' },
          { icon: Award, value: verifiedCount, label: 'Verified', hue: 'amber' },
        ]}
      />

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px] flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search members by name or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9 h-10 bg-card border-border/70"
            />
          </div>
          <Button onClick={handleSearch} variant="default" size="icon" className="h-10 w-10 shrink-0">
            <Search className="w-4 h-4" />
          </Button>
        </div>
        <Select value={selectedRole} onValueChange={handleRoleChange}>
          <SelectTrigger className="w-[200px] h-10 bg-card border-border/70">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Member Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : members.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No members found</h3>
          <p className="text-muted-foreground">Try a different search or filter</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              currentUserId={currentUser?.id}
              onFollow={() => followMutation.mutate({ followingId: member.id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MemberCard({
  member,
  currentUserId,
  onFollow,
}: {
  member: { id: number; name: string | null; platformRole: string | null; reputationScore: number; verificationStatus?: string | null };
  currentUserId?: number;
  onFollow: () => void;
}) {
  const initials = member.name
    ? member.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';
  const roleHue = member.platformRole ? hueFor(member.platformRole) : 'blue';
  const roleLabel = member.platformRole ? ROLE_LABELS[member.platformRole] || member.platformRole : 'Member';
  const avatarColor = CATEGORY_COLORS[hueFor(member.id)].solid;

  return (
    <div className="opa-card flex items-start gap-3 rounded-lg border bg-card p-4">
      <Link href={`/members/${member.id}`}>
        <Avatar className="h-11 w-11 shrink-0 cursor-pointer">
          <AvatarFallback className="font-heading font-semibold text-[15px] text-white" style={{ background: avatarColor }}>
            {initials}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/members/${member.id}`}>
          <div className="flex items-center gap-1.5 cursor-pointer">
            <span className="font-semibold text-[15px] text-foreground hover:text-primary transition-colors truncate">
              {member.name || 'Anonymous'}
            </span>
            <VerifiedBadge status={member.verificationStatus} />
          </div>
        </Link>
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <CategoryPill hue={roleHue}>{roleLabel}</CategoryPill>
          <span className="text-xs text-muted-foreground">{member.reputationScore} rep</span>
        </div>
      </div>
      {currentUserId && currentUserId !== member.id && (
        <Button size="sm" variant="ghost" onClick={onFollow} className="shrink-0 text-[13px]">
          Connect
        </Button>
      )}
    </div>
  );
}
