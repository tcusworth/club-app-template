import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MessageSquare, Eye, Calendar } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatDistanceToNow } from 'date-fns';

export default function DiscussionSearch() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'replies' | 'views'>('recent');
  const [minReplies, setMinReplies] = useState<number | undefined>();
  const [minViews, setMinViews] = useState<number | undefined>();
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  const { data: results, isLoading, error } = trpc.forum.searchDiscussions.useQuery(
    {
      query: query || undefined,
      sortBy,
      minReplies,
      minViews,
      limit,
      offset,
    },
    { enabled: query.length > 0 || minReplies !== undefined || minViews !== undefined }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
  };

  const handleClearFilters = () => {
    setQuery('');
    setMinReplies(undefined);
    setMinViews(undefined);
    setSortBy('recent');
    setOffset(0);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Search Discussions</h1>
          <p className="text-muted-foreground">Find relevant OPA discussions and insights</p>
        </div>

        {/* Search Form */}
        <Card className="p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Search discussions by title or content..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Sort By</label>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="replies">Most Replies</SelectItem>
                    <SelectItem value="views">Most Views</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Min Replies</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={minReplies ?? ''}
                  onChange={(e) => setMinReplies(e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Min Views</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={minViews ?? ''}
                  onChange={(e) => setMinViews(e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>

              <div className="flex items-end gap-2">
                <Button type="submit" className="flex-1">Search</Button>
                {(query || minReplies !== undefined || minViews !== undefined) && (
                  <Button type="button" variant="outline" onClick={handleClearFilters}>Clear</Button>
                )}
              </div>
            </div>
          </form>
        </Card>

        {/* Results */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {error && (
          <Card className="p-6 bg-destructive/10 border-destructive/20">
            <p className="text-destructive">Error searching discussions: {error.message}</p>
          </Card>
        )}

        {results && results.length === 0 && (query || minReplies !== undefined || minViews !== undefined) && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No discussions found matching your criteria.</p>
            <Button variant="outline" onClick={handleClearFilters}>Clear Filters</Button>
          </Card>
        )}

        {results && results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Found {results.length} discussions</p>
            {results.map((discussion: any) => (
              <Card
                key={discussion.id}
                className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setLocation(`/community/${discussion.slug}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2 hover:text-primary">{discussion.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{discussion.content}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{discussion.replyCount} replies</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{discussion.viewCount} views</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDistanceToNow(new Date(discussion.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>

                    {discussion.tags && discussion.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {discussion.tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {discussion.isPinned && (
                    <Badge className="bg-amber-500">Pinned</Badge>
                  )}
                </div>
              </Card>
            ))}

            {/* Pagination */}
            {results.length === limit && (
              <div className="flex justify-center gap-4 mt-8">
                <Button
                  variant="outline"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setOffset(offset + limit)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}

        {!query && minReplies === undefined && minViews === undefined && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">Enter search terms or apply filters to get started</p>
          </Card>
        )}
      </div>
    </div>
  );
}
