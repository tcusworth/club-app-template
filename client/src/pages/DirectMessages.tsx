import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Send, MessageCircle, Search, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

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

export default function DirectMessages() {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationQuery = trpc.forum.getConversation.useQuery(
    { userId: selectedUserId! },
    { enabled: !!selectedUserId && !!user, refetchInterval: 5000 }
  );
  const membersQuery = trpc.directory.searchMembers.useQuery(
    { query: searchQuery, limit: 20 },
    { enabled: searchQuery.length > 0 }
  );

  const sendMessageMutation = trpc.forum.sendMessage.useMutation({
    onSuccess: () => {
      setMessageText('');
      conversationQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationQuery.data]);

  const handleSend = () => {
    if (!messageText.trim() || !selectedUserId) return;
    sendMessageMutation.mutate({ recipientId: selectedUserId, content: messageText.trim() });
  };

  const messages = conversationQuery.data || [];
  const searchResults = membersQuery.data || [];

  if (!user) {
    return (
      <Card className="p-12 text-center">
        <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Sign in to message members</h3>
        <Link href="/">
          <Button>Sign In</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="opa-card h-[calc(100vh-8rem)] flex gap-0 rounded-lg overflow-hidden border bg-card">
      {/* Left: Conversation List */}
      <div className={`w-full md:w-[300px] border-r border-border flex flex-col bg-card ${selectedUserId ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>

        {/* Search Results */}
        {searchQuery && searchResults.length > 0 && (
          <div className="border-b border-border">
            <p className="px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">Start a conversation</p>
            {searchResults.filter(m => m.id !== user.id).map((member) => (
              <button
                key={member.id}
                onClick={() => { setSelectedUserId(member.id); setSearchQuery(''); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-sm font-semibold">{member.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{member.name || 'Anonymous'}</p>
                  <p className="text-xs text-muted-foreground">{member.reputationScore} pts</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {!searchQuery ? (
            <div className="p-6 text-center">
              <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Search for a member to start chatting.</p>
            </div>
          ) : (
            searchResults.filter(m => m.id !== user?.id).map((member: any) => {
              const isSelected = selectedUserId === member.id;
              return (
                <button
                  key={member.id}
                  onClick={() => { setSelectedUserId(member.id); setSearchQuery(''); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 ${isSelected ? 'bg-accent' : ''}`}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="font-semibold">{member.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{member.name || 'Anonymous'}</p>
                    <p className="text-xs text-muted-foreground">{member.reputationScore} pts</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Chat Window */}
      {selectedUserId ? (
        <div className="flex-1 flex flex-col bg-card">
          {/* Chat Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
            <button
              className="md:hidden p-1 rounded hover:bg-muted transition-colors"
              onClick={() => setSelectedUserId(null)}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="font-semibold">U</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">Member #{selectedUserId}</p>
              <p className="text-xs text-muted-foreground">OPA Community Member</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {conversationQuery.isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No messages yet. Say hello!</p>
                </div>
              </div>
            ) : (
              messages.map((msg: any) => {
                const isOwn = msg.senderId === user.id;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                      <div className={`px-4 py-2.5 rounded-lg text-sm ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}>
                        {msg.content}
                      </div>
                      <p className={`text-xs text-muted-foreground mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                        {timeAgo(new Date(msg.createdAt))}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-border bg-card">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!messageText.trim() || sendMessageMutation.isPending}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-card">
          <div className="text-center">
            <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Select a conversation</h3>
            <p className="text-muted-foreground">Choose from your conversations or search for a member to start chatting.</p>
          </div>
        </div>
      )}
    </div>
  );
}
