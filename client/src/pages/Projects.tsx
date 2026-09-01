import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { FolderKanban, Plus, ArrowRight, Users, Calendar } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Projects() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const { data: projects, refetch } = trpc.projects.list.useQuery(undefined, { enabled: !!user });

  const createProject = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      toast.success("Project created");
      setDialogOpen(false);
      setNewName("");
      setNewDesc("");
      refetch();
      if (data.id) setLocation(`/projects/${data.id}`);
    },
  });

  if (!user) {
    return (
      <div className="text-center py-16">
        <FolderKanban className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Sign in to access project workspaces</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Project Workspaces</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Private collaboration rooms for OPA projects</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> New Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Project Workspace</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Project Name</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g., Refinery Unit 5 OPA Migration" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Brief project description" rows={3} />
              </div>
              <Button onClick={() => {
                if (!newName.trim()) return;
                createProject.mutate({ name: newName, description: newDesc || undefined });
              }} disabled={createProject.isPending || !newName.trim()} className="w-full">
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid gap-3">
          {projects.map(project => (
            <Card
              key={project.id}
              className="card-glow cursor-pointer border-border/30 hover:border-border/60 transition-all"
              onClick={() => setLocation(`/projects/${project.id}`)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-violet-400/10 shrink-0">
                  <FolderKanban className="h-5 w-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium">{project.name}</h3>
                  {project.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{project.description}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <FolderKanban className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No projects yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Create a project workspace to start collaborating</p>
        </div>
      )}
    </div>
  );
}
