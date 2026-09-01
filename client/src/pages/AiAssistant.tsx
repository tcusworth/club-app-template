import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Sparkles, Send, Loader2, MessageSquare, Plus, ArrowRight, Bot, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

type ChatMessage = {
  role: string;
  content: string;
  timestamp: number;
};

export default function AiAssistant() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: chats, refetch: refetchChats } = trpc.ai.chats.useQuery(undefined, { enabled: !!user });

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setActiveChatId(data.chatId ?? null);
      setMessages(prev => [...prev, { role: "assistant", content: data.response, timestamp: Date.now() }]);
      setIsLoading(false);
      refetchChats();
    },
    onError: () => {
      toast.error("Failed to get response");
      setIsLoading(false);
    },
  });

  const loadChat = async (chatId: number) => {
    setActiveChatId(chatId);
    const chat = chats?.find(c => c.id === chatId);
    if (chat?.messages) {
      setMessages(chat.messages as ChatMessage[]);
    }
  };

  const startNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
  };

  const handleSend = () => {
    if (!message.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: "user", content: message, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    chatMutation.mutate({
      chatId: activeChatId ?? undefined,
      message: message,
    });
    setMessage("");
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!user) {
    return (
      <div className="text-center py-16">
        <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Sign in to access the AI Assistant</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex gap-4">
      {/* Chat History Sidebar */}
      <div className="w-64 shrink-0 hidden lg:block">
        <Card className="border-border/30 h-full flex flex-col">
          <CardHeader className="pb-2 pt-3 px-3 flex flex-row items-center justify-between shrink-0">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Conversations</CardTitle>
            <Button size="sm" variant="ghost" onClick={startNewChat} className="h-7 w-7 p-0">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="px-3 pb-3 flex-1 overflow-y-auto">
            <div className="space-y-1">
              {chats?.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => loadChat(chat.id)}
                  className={`w-full text-left p-2 rounded-md transition-colors text-xs truncate ${
                    activeChatId === chat.id ? "bg-primary/10 text-primary" : "hover:bg-accent text-muted-foreground"
                  }`}
                >
                  {chat.title || "Untitled chat"}
                </button>
              ))}
              {(!chats || chats.length === 0) && (
                <p className="text-[10px] text-muted-foreground/60 text-center py-4">No conversations yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <Card className="border-border/30 flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border/30 shrink-0 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-medium">OPA AI Assistant</h2>
              <p className="text-[10px] text-muted-foreground">Explainable reasoning tied to O-PAS capabilities</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Sparkles className="h-12 w-12 text-primary/20 mb-4" />
                <h3 className="text-sm font-medium mb-1">OPA AI Assistant</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Ask about O-PAS architecture, capabilities, vendor evaluation, migration strategies, or RFP language. All responses reference specific O-PAS capabilities.
                </p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {[
                    "What is the DCN in O-PAS?",
                    "Compare OPA vs traditional DCS",
                    "Help me evaluate vendor claims",
                    "Draft RFP language for connectivity",
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => { setMessage(q); }}
                      className="px-3 py-1.5 rounded-lg border border-border/40 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="p-1.5 rounded-lg bg-primary/10 h-fit shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/30 border border-border/20"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-invert prose-sm max-w-none text-xs">
                      <Streamdown>{msg.content}</Streamdown>
                    </div>
                  ) : (
                    <p className="text-xs">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="p-1.5 rounded-lg bg-muted/30 h-fit shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="p-1.5 rounded-lg bg-primary/10 h-fit shrink-0">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-muted/30 border border-border/20 rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border/30 shrink-0">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ask about O-PAS architecture, capabilities, or migration..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button onClick={handleSend} disabled={!message.trim() || isLoading} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
