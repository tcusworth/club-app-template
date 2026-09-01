import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useEffect } from 'react';
import {
  MessageSquare, Users, BookOpen, Trophy, Zap, Shield,
  ArrowRight, CheckCircle, Lightbulb, Network, GitBranch,
  TrendingUp, Clock, Eye,
} from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (user) {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  // Fetch community stats
  const { data: userCount } = trpc.admin.users.count.useQuery();
  const { data: discussions } = trpc.forum.getDiscussionsByCategory.useQuery({ categoryId: 0, limit: 6 });
  const { data: categories } = trpc.forum.getCategories.useQuery();

  const stats = [
    { icon: Users, label: 'Active Members', value: userCount?.count ?? 0 },
    { icon: MessageSquare, label: 'Discussions', value: discussions?.length ?? 0 },
    { icon: BookOpen, label: 'Resources', value: '50+' },
    { icon: Trophy, label: 'Expert Contributors', value: '20+' },
  ];

  const features = [
    {
      icon: MessageSquare,
      title: 'Active Discussions',
      description: 'Join conversations about OPA implementation, architecture, and best practices.',
    },
    {
      icon: Users,
      title: 'Expert Community',
      description: 'Connect with system integrators, end users, and OPA specialists.',
    },
    {
      icon: BookOpen,
      title: 'Knowledge Base',
      description: 'Access curated resources, guides, and case studies on Open Process Automation.',
    },
    {
      icon: Network,
      title: 'O-PAS Architecture',
      description: 'Learn vendor-neutral automation architecture and design patterns.',
    },
    {
      icon: Trophy,
      title: 'Community Recognition',
      description: 'Earn badges and reputation for contributing valuable insights.',
    },
    {
      icon: Zap,
      title: 'Real-World Insights',
      description: 'Discover practical implementation strategies and lessons learned.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center font-bold text-slate-900">
              O
            </div>
            <span className="font-bold text-lg">OPA Community</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="text-slate-300 hover:text-white"
              onClick={() => setLocation('/signin?returnTo=' + encodeURIComponent('/dashboard'))}
            >
              Forum
            </Button>
            <Button
              variant="ghost"
              className="text-slate-300 hover:text-white"
              onClick={() => setLocation('/signin')}
            >
              Sign In
            </Button>
            <Button
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              onClick={() => setLocation('/register')}
            >
              Join Community
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-300">The Vendor-Neutral Automation Community</span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold leading-tight">
            Master Open Process Automation
            <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
              with the OPA Community
            </span>
          </h1>

          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Connect with system integrators, end users, and OPA experts. Learn O-PAS architecture, best practices, and real-world implementation strategies.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
              onClick={() => setLocation('/register')}
            >
              Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-600 text-white hover:bg-slate-800"
              onClick={() => setLocation('/signin?returnTo=' + encodeURIComponent('/dashboard'))}
            >
              Explore Forum
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="bg-slate-800/50 border-slate-700/50 text-center">
                <CardContent className="p-6">
                  <Icon className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">What You'll Learn</h2>
          <p className="text-xl text-slate-300">Everything you need to understand and implement Open Process Automation</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Card key={i} className="bg-slate-800/50 border-slate-700/50 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10">
                <CardContent className="p-6">
                  <Icon className="w-10 h-10 text-blue-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Featured Discussions */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Recent Discussions</h2>
          <p className="text-xl text-slate-300">Join conversations happening in the community right now</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {discussions?.slice(0, 4).map((discussion: any, i: number) => (
            <Card
              key={i}
              className="bg-slate-800/50 border-slate-700/50 hover:border-blue-500/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-blue-500/10"
              onClick={() => setLocation('/signin?returnTo=' + encodeURIComponent(`/community/${discussion.slug}`))}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-3">
                  <Badge variant="outline" className="border-blue-500/30 text-blue-300 bg-blue-500/10">
                    {discussion.postType || 'Discussion'}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">{discussion.title}</h3>
                <p className="text-slate-400 text-sm line-clamp-2 mb-4">
                  {discussion.content?.replace(/<[^>]*>/g, '')}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {discussion.viewCount || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> {discussion.replyCount || 0}
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(discussion.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button
            size="lg"
            variant="outline"
            className="border-slate-600 text-white hover:bg-slate-800"
            onClick={() => setLocation('/signin?returnTo=' + encodeURIComponent('/dashboard'))}
          >
            View All Discussions <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Categories Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Explore by Topic</h2>
          <p className="text-xl text-slate-300">Browse discussions organized by key OPA areas</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories?.slice(0, 6).map((category: any, i: number) => (
            <Card
              key={i}
              className="bg-slate-800/50 border-slate-700/50 hover:border-blue-500/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-blue-500/10"
              onClick={() => setLocation('/signin?returnTo=' + encodeURIComponent('/dashboard'))}
            >
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-2">{category.name}</h3>
                <p className="text-slate-400 text-sm mb-3">{category.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-300">
                    {category.discussionCount || 0} discussions
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-2xl p-12 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Join the OPA Community?</h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Connect with industry experts, learn O-PAS architecture, and stay ahead of the automation transformation.
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
            onClick={() => setLocation('/register')}
          >
            Create Free Account <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 bg-slate-900/50 mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center font-bold text-slate-900">
                  O
                </div>
                <span className="font-bold">OPA Community</span>
              </div>
              <p className="text-sm text-slate-400">The vendor-neutral automation community</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="/signin?returnTo=%2Fdashboard" className="hover:text-white transition">Forum</a></li>
                <li><a href="/signin?returnTo=%2Fdashboard" className="hover:text-white transition">Discussions</a></li>
                <li><a href="/signin?returnTo=%2Fmembers" className="hover:text-white transition">Members</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="/signin?returnTo=%2Fcase-studies" className="hover:text-white transition">Case Studies</a></li>
                <li><a href="/signin?returnTo=%2Fblog" className="hover:text-white transition">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">About</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="/signin" className="hover:text-white transition">About OPA</a></li>
                <li><a href="/signin" className="hover:text-white transition">Contact</a></li>
                <li><a href="/signin" className="hover:text-white transition">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700/50 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2026 OPA Community. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
