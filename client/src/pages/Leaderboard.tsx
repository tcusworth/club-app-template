import React from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, TrendingUp, Star } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  owner_operator: 'Owner/Operator',
  epc_integrator: 'EPC/Integrator',
  automation_engineer: 'Automation Engineer',
  executive: 'Executive',
  vendor: 'Vendor',
  analyst: 'Analyst/Researcher',
};

export default function Leaderboard() {
  const leaderboardQuery = trpc.gamification.getLeaderboard.useQuery({ limit: 50 });

  const members = leaderboardQuery.data || [];

  const topThree = members.slice(0, 3);
  const rest = members.slice(3);

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-slate-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Trophy className="w-8 h-8 text-yellow-400" />
          <h1 className="text-3xl font-bold text-foreground">Community Leaderboard</h1>
          <Trophy className="w-8 h-8 text-yellow-400" />
        </div>
        <p className="text-muted-foreground">Top contributors to the OPA community</p>
      </div>

      {/* Top 3 Podium */}
      {topThree.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 items-end">
          {/* 2nd place */}
          <Card className="p-4 text-center border-slate-500/30 bg-slate-500/5">
            <div className="flex justify-center mb-3">
              <Medal className="w-10 h-10 text-slate-400" />
            </div>
            <Avatar className="h-16 w-16 mx-auto mb-2 ring-2 ring-slate-400">
              <AvatarFallback className="text-xl font-bold">
                {topThree[1].name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-foreground text-sm">{topThree[1].name || 'Anonymous'}</p>
            <p className="text-xs text-muted-foreground mt-1">Member</p>
            <div className="mt-2 flex items-center justify-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-bold text-primary">{topThree[1].reputationScore}</span>
            </div>
          </Card>

          {/* 1st place */}
          <Card className="p-4 text-center border-yellow-500/40 bg-yellow-500/5 scale-105">
            <div className="flex justify-center mb-3">
              <Trophy className="w-12 h-12 text-yellow-400" />
            </div>
            <Avatar className="h-20 w-20 mx-auto mb-2 ring-2 ring-yellow-400">
              <AvatarFallback className="text-2xl font-bold">
                {topThree[0].name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <p className="font-bold text-foreground">{topThree[0].name || 'Anonymous'}</p>
            <p className="text-xs text-muted-foreground mt-1">Member</p>
            <div className="mt-2 flex items-center justify-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="font-bold text-yellow-400">{topThree[0].reputationScore}</span>
            </div>
          </Card>

          {/* 3rd place */}
          <Card className="p-4 text-center border-amber-600/30 bg-amber-600/5">
            <div className="flex justify-center mb-3">
              <Award className="w-10 h-10 text-amber-600" />
            </div>
            <Avatar className="h-16 w-16 mx-auto mb-2 ring-2 ring-amber-600">
              <AvatarFallback className="text-xl font-bold">
                {topThree[2].name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-foreground text-sm">{topThree[2].name || 'Anonymous'}</p>
            <p className="text-xs text-muted-foreground mt-1">Member</p>
            <div className="mt-2 flex items-center justify-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-bold text-primary">{topThree[2].reputationScore}</span>
            </div>
          </Card>
        </div>
      )}

      {/* Full Rankings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Full Rankings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {leaderboardQuery.isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading rankings...</div>
          ) : members.length === 0 ? (
            <div className="p-12 text-center">
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No members ranked yet. Start contributing to earn points!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {members.map((member, index) => (
                <Link key={member.id} href={`/members/${member.id}`}>
                  <div className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="w-8 flex justify-center shrink-0">
                      {rankIcon(index + 1)}
                    </div>
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="font-semibold">
                        {member.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{member.name || 'Anonymous'}</p>
                      <p className="text-xs text-muted-foreground">Member</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="font-bold text-primary">{member.reputationScore}</span>
                      <span className="text-xs text-muted-foreground">pts</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Points Guide */}
      <Card className="p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400" />
          How to Earn Points
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { action: 'Start a Discussion', points: '+10' },
            { action: 'Reply to a Post', points: '+5' },
            { action: 'Join a Group', points: '+3' },
            { action: 'Publish Knowledge Article', points: '+25' },
            { action: 'Earn a Badge', points: '+15' },
            { action: 'Follow a Member', points: '+1' },
          ].map((item) => (
            <div key={item.action} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-foreground">{item.action}</span>
              <Badge variant="secondary" className="text-primary font-bold">{item.points}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
