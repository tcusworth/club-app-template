import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/useMobile";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import {
  LayoutDashboard, BookOpen, MessageSquare, Users,
  Trophy, MessageCircle, FileText, Settings,
  LogOut, Search, Bell, User, Clock, Shield, Menu, X,
  Image, FolderOpen, UserCircle, Newspaper,
  CalendarDays, Rss, Hash, BarChart3, Briefcase,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { FEATURES, CLUB_NAME, CLUB_ICON } from "@/lib/clubConfig";

// ── Nav structure ────────────────
const discoverNav = [

  { icon: CalendarDays, label: "Events", path: "/events" },
  { icon: Rss, label: "Blog", path: "/blog" },
  { icon: Hash, label: "Tags", path: "/tags" },
  { icon: Users, label: "Member Directory", path: "/members" },
  { icon: FolderOpen, label: "Documents", path: "/documents" },
];

const resourcesNav = [
  { icon: FileText, label: "Case Studies", path: "/case-studies", flag: "caseStudies" as const },
  { icon: BarChart3, label: "Benchmarking", path: "/benchmarking", flag: "benchmarking" as const },
  { icon: Briefcase, label: "Consulting", path: "/consulting", flag: "consulting" as const },
].filter(item => FEATURES[item.flag]);

const personalNav = [
  { icon: UserCircle, label: "My Profile", path: "/profile" },
  { icon: User, label: "My Connections", path: "/connections" },
  { icon: MessageCircle, label: "Messages", path: "/messages", badge: true },
  { icon: Clock, label: "Activity Feed", path: "/activity" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const [location] = useLocation();

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    const returnTo = encodeURIComponent(location);
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 mb-4">
              <CLUB_ICON className="h-8 w-8 text-primary" />
              <span className="text-2xl font-semibold tracking-tight text-foreground">{CLUB_NAME}</span>
            </div>
            <h1 className="text-xl font-medium text-center text-foreground">Sign in to continue</h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access the {CLUB_NAME} platform for tools and collaboration.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Button onClick={() => { window.location.href = `/signin?returnTo=${returnTo}`; }} size="lg" className="w-full">
              Sign In
            </Button>
            <Button variant="outline" onClick={() => { window.location.href = `/register?returnTo=${returnTo}`; }} size="lg" className="w-full">
              Create Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const isMobile = useIsMobile();
  const isAdmin = user?.role === "admin";

  // Real-time notification count with aggressive polling
  const { unreadCount } = useNotificationCount();

  // Message count (placeholder)
  const messageCount = 0;

  const adminNav = isAdmin ? [
    { icon: Shield, label: "Administration", path: "/admin" },
  ] : [];

  const isActive = (path: string | null) => {
    if (!path) return false;
    const cleanPath = path.includes("?") ? path.split("?")[0] : path;
    // Exact match
    if (location === cleanPath) return true;
    // Prefix match only for true sub-routes (e.g. /knowledge/article-slug highlights /knowledge)
    // Require a trailing slash to avoid /community matching /community-forum etc.
    if (cleanPath !== "/" && location.startsWith(cleanPath + "/")) return true;
    return false;
  };

  const navigate = (path: string | null) => {
    if (!path) return;
    setLocation(path.split("?")[0]);
    if (isMobile) setMobileMenuOpen(false);
  };

  const NavSection = ({
    label,
    items,
  }: {
    label?: string;
    items: { icon: any; label: string; path: string | null; badge?: boolean }[];
  }) => (
    <div className="mb-1">
      {label && (
        <p className="mt-4 px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
      )}
      {items.map((item) => {
        const active = isActive(item.path);
        const isPlaceholder = item.path === null;
        return (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            disabled={isPlaceholder}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all group
              ${active
                ? "bg-primary text-primary-foreground font-semibold"
                : isPlaceholder
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : "text-foreground/70 hover:bg-accent hover:text-foreground"
              }`}
          >
            <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
            <span className="flex-1 text-left truncate">{item.label}</span>
            {item.badge && messageCount > 0 && (
              <Badge className="h-4 min-w-4 px-1 text-[10px] rounded-full bg-destructive text-destructive-foreground">{messageCount}</Badge>
            )}
          </button>
        );
      })}
    </div>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex-1 px-2 py-3 space-y-0">
        {/* Dashboard link */}
        <button
          onClick={() => navigate("/")}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all group mb-1
            ${location === "/" ? "bg-primary text-primary-foreground font-semibold" : "text-foreground/70 hover:bg-accent hover:text-foreground"}`}
        >
          <LayoutDashboard className={`h-4 w-4 shrink-0 ${location === "/" ? "text-primary-foreground" : "text-muted-foreground"}`} />
          <span>Dashboard</span>
        </button>

        <NavSection label="Discover" items={discoverNav} />
        {resourcesNav.length > 0 && <NavSection label="Resources" items={resourcesNav} />}
        <NavSection label="My Space" items={personalNav} />
        {isAdmin && <NavSection label="Admin" items={adminNav} />}
      </div>

      {/* Account Settings at bottom */}
      <div className="px-2 pb-3 border-t border-border pt-2">
        <button
          onClick={() => navigate("/settings")}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all
            ${location === "/settings" ? "bg-primary text-primary-foreground font-semibold" : "text-foreground/70 hover:bg-accent hover:text-foreground"}`}
        >
          <Settings className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>Account Settings</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Top Navigation Bar ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 h-[60px] bg-background border-b border-border flex items-center px-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => isMobile ? setMobileMenuOpen(!mobileMenuOpen) : setSidebarOpen(!sidebarOpen)}
            className="h-[34px] w-[34px] flex items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center shrink-0">
              <CLUB_ICON className="h-4 w-4 text-white" />
            </div>
            <span className="font-heading font-semibold text-xl tracking-tight text-foreground hidden sm:block">{CLUB_NAME}</span>
          </button>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search the community…"
              className="pl-9 h-10 text-sm bg-card border-border/70 cursor-pointer"
              readOnly
              onClick={() => navigate("/search")}
            />
          </div>
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Mobile search */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="md:hidden h-[34px] w-[34px] flex items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Notifications */}
          <button
            onClick={() => navigate("/notifications")}
            className="relative h-[34px] w-[34px] flex items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Messages */}
          <button
            onClick={() => navigate("/messages")}
            className="relative h-[34px] w-[34px] flex items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
          >
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* User avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 ml-1 rounded-full focus:outline-none">
                <Avatar className="h-8 w-8">
                  <AvatarFallback
                    className="text-xs font-heading font-semibold text-white"
                    style={{ background: "linear-gradient(135deg, var(--category-violet-solid), var(--category-blue-solid))" }}
                  >
                    {user?.name?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground hidden sm:block">{user?.name?.split(" ")[0]}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{(user as any)?.email || ""}</p>
              </div>
              <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>My Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile search bar */}
      {searchOpen && (
        <div className="md:hidden px-4 py-2 bg-background border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-9 h-8 text-sm" autoFocus />
          </div>
        </div>
      )}

      {/* ── Body: Sidebar + Content ──────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <aside
            className={`shrink-0 bg-background border-r border-border transition-all duration-200 ${
              sidebarOpen ? "w-[230px]" : "w-0 overflow-hidden"
            }`}
          >
            {sidebarOpen && (
              <div className="w-[230px] h-full">
                <SidebarContent />
              </div>
            )}
          </aside>
        )}

        {/* Mobile Sidebar Overlay */}
        {isMobile && mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="fixed left-0 top-[60px] bottom-0 z-50 w-64 bg-background border-r border-border shadow-xl overflow-y-auto">
              <SidebarContent />
            </aside>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="max-w-[1180px] mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
