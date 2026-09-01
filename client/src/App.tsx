import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Landing from "./pages/Landing";

import Capabilities from "./pages/Capabilities";
import CapabilityDetail from "./pages/CapabilityDetail";
import ArchitectureBuilder from "./pages/ArchitectureBuilder";
import MigrationPlanner from "./pages/MigrationPlanner";
import RfpGenerator from "./pages/RfpGenerator";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Vendors from "./pages/Vendors";
import VendorDetail from "./pages/VendorDetail";
import AiAssistant from "./pages/AiAssistant";
import Onboarding from "./pages/Onboarding";
import UserSettings from "./pages/UserSettings";
import Admin from "./pages/Admin";
import RoiCalculator from "./pages/RoiCalculator";
// CommunityForum removed — discussions now live on Dashboard
import DiscussionThread from "./pages/DiscussionThread";
import MemberDirectory from '@/pages/MemberDirectory';
import DirectMessages from '@/pages/DirectMessages';
import MemberProfile from "./pages/MemberProfile";
import Leaderboard from "./pages/Leaderboard";
import ActivityFeed from "./pages/ActivityFeed";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Notifications from "./pages/Notifications";
import Events from "./pages/Events";
import GroupDetail from "./pages/GroupDetail";
import MyProfile from "./pages/MyProfile";
import MyConnections from "./pages/MyConnections";
import GlobalSearch from './pages/GlobalSearch';
import SpaceHub from './pages/SpaceHub';
import TagDetail, { TagsIndex } from './pages/Tags';
import CaseStudies, { CaseStudyDetail } from './pages/CaseStudies';
import Benchmarking from './pages/Benchmarking';
import Consulting from './pages/Consulting';
import SignIn from "./pages/SignIn";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { FEATURES } from "@/lib/clubConfig";
import { useAuth } from "./_core/hooks/useAuth";

// Landing page wrapper: shows Landing for unauthenticated, Dashboard for authenticated
function LandingOrDashboard() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }
  if (!user) {
    return <Landing />;
  }
  return (
    <DashboardLayout><Home /></DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/" component={LandingOrDashboard} />
      <Route path="/dashboard">
        <DashboardLayout><Home /></DashboardLayout>
      </Route>

      {FEATURES.capabilities && (
        <Route path="/capabilities">
          <DashboardLayout><Capabilities /></DashboardLayout>
        </Route>
      )}
      {FEATURES.capabilities && (
        <Route path="/capabilities/:slug">
          {(params) => <DashboardLayout><CapabilityDetail slug={params.slug} /></DashboardLayout>}
        </Route>
      )}
      {FEATURES.architectureBuilder && (
        <Route path="/tools/architecture">
          <DashboardLayout><ArchitectureBuilder /></DashboardLayout>
        </Route>
      )}
      {FEATURES.migrationPlanner && (
        <Route path="/tools/migration">
          <DashboardLayout><MigrationPlanner /></DashboardLayout>
        </Route>
      )}
      {FEATURES.rfpGenerator && (
        <Route path="/tools/rfp">
          <DashboardLayout><RfpGenerator /></DashboardLayout>
        </Route>
      )}
      {FEATURES.projects && (
        <Route path="/projects">
          <DashboardLayout><Projects /></DashboardLayout>
        </Route>
      )}
      {FEATURES.projects && (
        <Route path="/projects/:id">
          {(params) => <DashboardLayout><ProjectDetail id={parseInt(params.id)} /></DashboardLayout>}
        </Route>
      )}
      {FEATURES.vendors && (
        <Route path="/vendors">
          <DashboardLayout><Vendors /></DashboardLayout>
        </Route>
      )}
      {FEATURES.vendors && (
        <Route path="/vendors/:slug">
          {(params) => <DashboardLayout><VendorDetail slug={params.slug} /></DashboardLayout>}
        </Route>
      )}
      <Route path="/ai">
        <DashboardLayout><AiAssistant /></DashboardLayout>
      </Route>
      <Route path="/settings">
        <DashboardLayout><UserSettings /></DashboardLayout>
      </Route>
      <Route path="/admin">
        <DashboardLayout><Admin /></DashboardLayout>
      </Route>
      {FEATURES.roiCalculator && (
        <Route path="/roi-calculator">
          <DashboardLayout><RoiCalculator /></DashboardLayout>
        </Route>
      )}

      <Route path="/community/:slug">
        {(params) => <DashboardLayout><DiscussionThread slug={params.slug} /></DashboardLayout>}
      </Route>
      {/* More specific route MUST come before the generic /members route in Wouter Switch */}
      <Route path="/members/:id">
        {(params) => <DashboardLayout><MemberProfile userId={parseInt(params.id)} /></DashboardLayout>}
      </Route>
      <Route path="/members">
        <DashboardLayout><MemberDirectory /></DashboardLayout>
      </Route>
      <Route path="/events">
        <DashboardLayout><Events /></DashboardLayout>
      </Route>
      <Route path="/notifications">
        <DashboardLayout><Notifications /></DashboardLayout>
      </Route>
      <Route path="/connections">
        <DashboardLayout><MyConnections /></DashboardLayout>
      </Route>
      <Route path="/search">
        <DashboardLayout><GlobalSearch /></DashboardLayout>
      </Route>
      <Route path="/leaderboard">
        <DashboardLayout><Leaderboard /></DashboardLayout>
      </Route>
      <Route path="/activity">
        <DashboardLayout><ActivityFeed /></DashboardLayout>
      </Route>
      <Route path="/messages">
        <DashboardLayout><DirectMessages /></DashboardLayout>
      </Route>
      <Route path="/profile">
        <DashboardLayout><MyProfile /></DashboardLayout>
      </Route>
      <Route path="/blog">
        <DashboardLayout><Blog /></DashboardLayout>
      </Route>
      <Route path="/blog/:slug">
        {(params) => <DashboardLayout><BlogPost slug={params.slug} /></DashboardLayout>}
      </Route>
      <Route path="/spaces/:id">
        {(params) => <DashboardLayout><SpaceHub categoryId={params.id} /></DashboardLayout>}
      </Route>
      <Route path="/tags">
        <TagsIndex />
      </Route>
      <Route path="/tags/:slug">
        {(params) => <TagDetail />}
      </Route>
      {FEATURES.caseStudies && (
        <Route path="/case-studies/:id">
          {(params) => <DashboardLayout><CaseStudyDetail /></DashboardLayout>}
        </Route>
      )}
      {FEATURES.caseStudies && (
        <Route path="/case-studies">
          <DashboardLayout><CaseStudies /></DashboardLayout>
        </Route>
      )}
      {FEATURES.benchmarking && (
        <Route path="/benchmarking">
          <DashboardLayout><Benchmarking /></DashboardLayout>
        </Route>
      )}
      {FEATURES.consulting && (
        <Route path="/consulting">
          <DashboardLayout><Consulting /></DashboardLayout>
        </Route>
      )}
      <Route path="/signin" component={SignIn} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/auth/magic-link" component={MagicLinkVerify} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
