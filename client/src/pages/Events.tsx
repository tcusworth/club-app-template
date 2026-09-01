import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/_core/hooks/useAuth';
import SectionHeroBanner from '@/components/SectionHeroBanner';
import { StatStrip } from '@/components/dashboard/StatStrip';
import { CategoryPill } from '@/components/dashboard/ListCard';
import { hueFor, CATEGORY_COLORS } from '@/lib/categoryColors';
import { toast } from "sonner";
import {
  Calendar, MapPin, Video, Users, Plus, Clock,
  CheckCircle2, HelpCircle, XCircle, PlayCircle, Film,
  ChevronLeft, ChevronRight, Briefcase,
} from "lucide-react";

const EVENT_TYPES = [
  { value: "webinar", label: "Webinar" },
  { value: "ama", label: "AMA (Ask Me Anything)" },
  { value: "roundtable", label: "Roundtable" },
  { value: "working_group", label: "Working Group" },
  { value: "conference", label: "Conference" },
  { value: "office_hours", label: "Office Hours" },
  { value: "training_cohort", label: "Training Cohort" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    upcoming: "bg-blue-500/10 text-blue-600",
    ongoing: "bg-green-500/10 text-green-600",
    completed: "bg-muted text-muted-foreground",
    cancelled: "bg-red-500/10 text-red-600",
  };
  return map[status] ?? "bg-muted text-muted-foreground";
}

function statusDot(status: string) {
  const map: Record<string, string> = {
    upcoming: "bg-blue-500",
    ongoing: "bg-green-500",
    completed: "bg-muted-foreground",
    cancelled: "bg-red-500",
  };
  return map[status] ?? "bg-muted-foreground";
}

// ─── Calendar Grid View ───────────────────────────────────────────────────────
function CalendarView({ events, onSelectEvent }: { events: any[]; onSelectEvent: (e: any) => void }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Map events to their day-of-month for this month/year
  const eventsByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    for (const ev of events) {
      const d = new Date(ev.startDate);
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(ev);
      }
    }
    return map;
  }, [events, viewYear, viewMonth]);

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (day: number) =>
    day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-accent transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-accent transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 text-center">
        {DAYS.map(d => (
          <div key={d} className="text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {cells.map((day, idx) => {
          const hasEvents = day ? (eventsByDay[day]?.length ?? 0) > 0 : false;
          const isSelected = day === selectedDay;
          const isTodayDay = day ? isToday(day) : false;
          return (
            <div
              key={idx}
              onClick={() => day && setSelectedDay(isSelected ? null : day)}
              className={`bg-card min-h-[52px] p-1.5 flex flex-col items-center cursor-pointer transition-colors
                ${day ? "hover:bg-accent/60" : "opacity-0 pointer-events-none"}
                ${isSelected ? "bg-primary/10 ring-1 ring-inset ring-primary/40" : ""}
              `}
            >
              {day && (
                <>
                  <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium
                    ${isTodayDay ? "bg-primary text-primary-foreground" : "text-foreground"}
                  `}>
                    {day}
                  </span>
                  {hasEvents && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {(eventsByDay[day] ?? []).slice(0, 3).map((ev, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${statusDot(ev.status)}`} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected day events */}
      {selectedDay && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {MONTHS[viewMonth]} {selectedDay}
          </p>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events on this day.</p>
          ) : (
            selectedEvents.map((ev: any) => (
              <div
                key={ev.id}
                onClick={() => onSelectEvent(ev)}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot(ev.status)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(ev.startDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    {ev.isVirtual ? " · Virtual" : ev.location ? ` · ${ev.location}` : ""}
                  </p>
                </div>
                <Badge className={`text-[10px] shrink-0 ${statusBadge(ev.status)}`}>{ev.status}</Badge>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Events Page ─────────────────────────────────────────────────────────
export default function Events() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", startDate: "", endDate: "",
    location: "", isVirtual: false, meetingUrl: "", maxAttendees: "",
    eventType: "", replayUrl: "",
  });

  const { data: eventList = [], isLoading } = trpc.events.list.useQuery({ limit: 100 });
  const { data: onDemandList = [], isLoading: onDemandLoading } = trpc.eventsOnDemand.list.useQuery({ limit: 20 });

  // ─── Stat strip figures ───────────────────────────────────────────────
  const now = new Date();
  const upcomingCount = (eventList as any[]).filter((e) => e.status === "upcoming").length;
  const thisMonthCount = (eventList as any[]).filter((e) => {
    const d = new Date(e.startDate);
    return e.status !== "cancelled" && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const pastCount = (eventList as any[]).filter((e) => e.status === "completed").length;
  const registrableEventIds = useMemo(
    () => (eventList as any[]).filter((e) => e.status !== "completed" && e.status !== "cancelled").map((e) => e.id),
    [eventList]
  );
  const myRsvpQueries = trpc.useQueries((t) =>
    user ? registrableEventIds.map((id) => t.events.getMyRsvp({ eventId: id })) : []
  );
  const registeredCount = myRsvpQueries.filter((q) => (q.data as any)?.status === "going").length;

  const createEvent = trpc.events.create.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      setCreateOpen(false);
      setForm({ title: "", description: "", startDate: "", endDate: "", location: "", isVirtual: false, meetingUrl: "", maxAttendees: "", eventType: "", replayUrl: "" });
      toast.success("Event created!");
    },
    onError: (e) => toast.error(e.message || "Failed to create event"),
  });

  const rsvp = trpc.events.rsvp.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      toast.success("RSVP updated!");
    },
  });

  const handleCreate = () => {
    if (!form.title || !form.startDate) return;
    createEvent.mutate({
      title: form.title,
      description: form.description || undefined,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      location: form.location || undefined,
      isVirtual: form.isVirtual,
      meetingUrl: form.meetingUrl || undefined,
      maxAttendees: form.maxAttendees ? parseInt(form.maxAttendees) : undefined,
      eventType: form.eventType as any || undefined,
      replayUrl: form.replayUrl || undefined,
    });
  };

  return (
    <>
      <div className="space-y-6">
        {/* Hero Banner */}
        <SectionHeroBanner sectionKey="events" />

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-heading text-[34px] font-semibold leading-tight">Events</h1>
            <p className="text-[15.5px] text-muted-foreground mt-1.5">
              Live sessions, workshops, and meetups across the O-PAS community.
            </p>
          </div>
          {user && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" /> Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Event</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <div>
                    <Label>Title *</Label>
                    <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="What's this event about?" />
                  </div>
                  <div>
                    <Label>Event Type</Label>
                    <Select value={form.eventType} onValueChange={v => setForm(f => ({ ...f, eventType: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select event type" /></SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Start Date & Time *</Label>
                      <Input type="datetime-local" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                    </div>
                    <div>
                      <Label>End Date & Time</Label>
                      <Input type="datetime-local" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={form.isVirtual} onCheckedChange={v => setForm(f => ({ ...f, isVirtual: v }))} />
                    <Label>Virtual Event</Label>
                  </div>
                  {form.isVirtual ? (
                    <div>
                      <Label>Meeting URL</Label>
                      <Input value={form.meetingUrl} onChange={e => setForm(f => ({ ...f, meetingUrl: e.target.value }))} placeholder="https://zoom.us/..." />
                    </div>
                  ) : (
                    <div>
                      <Label>Location</Label>
                      <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="City, venue, or address" />
                    </div>
                  )}
                  <div>
                    <Label>Max Attendees (optional)</Label>
                    <Input type="number" value={form.maxAttendees} onChange={e => setForm(f => ({ ...f, maxAttendees: e.target.value }))} placeholder="Leave blank for unlimited" />
                  </div>
                  <div>
                    <Label>Replay / Recording URL (optional)</Label>
                    <Input value={form.replayUrl} onChange={e => setForm(f => ({ ...f, replayUrl: e.target.value }))} placeholder="https://youtube.com/watch?v=..." />
                  </div>
                  <Button onClick={handleCreate} disabled={createEvent.isPending || !form.title || !form.startDate} className="w-full">
                    {createEvent.isPending ? "Creating..." : "Create Event"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stat strip */}
        <StatStrip
          items={[
            { icon: Calendar, value: upcomingCount, label: 'Upcoming', hue: 'blue' },
            { icon: Clock, value: thisMonthCount, label: 'This Month', hue: 'teal' },
            { icon: CheckCircle2, value: registeredCount, label: "You're Registered", hue: 'violet' },
            { icon: Briefcase, value: pastCount, label: 'Past Events', hue: 'amber' },
          ]}
        />

        {/* Tabs: Calendar / Upcoming / On-Demand */}
        <Tabs defaultValue="calendar">
          <TabsList className="grid grid-cols-3 max-w-sm">
            <TabsTrigger value="calendar" className="gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Upcoming
            </TabsTrigger>
            <TabsTrigger value="on-demand" className="gap-1.5">
              <Film className="w-3.5 h-3.5" /> On-Demand
            </TabsTrigger>
          </TabsList>

          {/* Calendar View */}
          <TabsContent value="calendar" className="mt-4">
            {isLoading ? (
              <div className="h-64 bg-muted animate-pulse rounded-xl" />
            ) : (
              <div className="max-w-xl">
                <CalendarView
                  events={eventList as any[]}
                  onSelectEvent={setSelectedEvent}
                />
              </div>
            )}
          </TabsContent>

          {/* Upcoming Events */}
          <TabsContent value="upcoming" className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
              </div>
            ) : (eventList as any[]).length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-foreground">No events yet</p>
                <p className="text-sm mt-1">Be the first to create an OPA community event.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(eventList as any[]).map((event: any) => (
                  <EventCard key={event.id} event={event} user={user} onRsvp={(status) => rsvp.mutate({ eventId: event.id, status })} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* On-Demand Recordings */}
          <TabsContent value="on-demand" className="mt-4">
            {onDemandLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />)}
              </div>
            ) : (onDemandList as any[]).length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Film className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-foreground">No recordings yet</p>
                <p className="text-sm mt-1">Completed events with replay links will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(onDemandList as any[]).map((event: any) => (
                  <Card key={event.id} className="opa-card border-border/60 hover:border-primary/40 transition-colors overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <PlayCircle className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold line-clamp-2 leading-snug">{event.title}</p>
                          {event.eventType && (
                            <Badge variant="secondary" className="text-[10px] mt-1 capitalize">
                              {event.eventType.replace('_', ' ')}
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground mt-1.5">
                            {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          {event.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{event.description}</p>
                          )}
                        </div>
                      </div>
                      <a
                        href={event.replayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"
                      >
                        <PlayCircle className="w-3.5 h-3.5" /> Watch Recording
                      </a>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Event detail modal (from calendar click) */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base leading-snug">{selectedEvent.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 shrink-0" />
                <span>{formatDate(selectedEvent.startDate)}</span>
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.isVirtual && selectedEvent.meetingUrl && (
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 shrink-0 text-primary" />
                  <a href={selectedEvent.meetingUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
                    Join Meeting
                  </a>
                </div>
              )}
              {selectedEvent.description && (
                <p className="text-muted-foreground leading-relaxed">{selectedEvent.description}</p>
              )}
              {user && selectedEvent.status !== "completed" && selectedEvent.status !== "cancelled" && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  {(["going", "maybe", "not_going"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => { rsvp.mutate({ eventId: selectedEvent.id, status: s }); setSelectedEvent(null); }}
                      className="flex-1 py-1.5 text-xs rounded-full border border-border hover:bg-accent transition-colors capitalize"
                    >
                      {s === "not_going" ? "Can't Go" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function EventCard({ event, user, onRsvp }: { event: any; user: any; onRsvp: (s: "going" | "maybe" | "not_going") => void }) {
  const { data: myRsvp } = trpc.events.getMyRsvp.useQuery(
    { eventId: event.id },
    { enabled: !!user }
  );
  const { data: attendeeCount = 0 } = trpc.events.getAttendeeCount.useQuery({ eventId: event.id });

  const eventTypeLabel = EVENT_TYPES.find(t => t.value === event.eventType)?.label;
  const formatLabel = eventTypeLabel || (event.isVirtual ? "Virtual" : "In-person");
  const formatHue = hueFor(formatLabel);
  const formatColors = CATEGORY_COLORS[formatHue];

  const start = new Date(event.startDate);
  const dateMonth = start.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const dateDay = start.getDate();

  return (
    <div className="opa-card flex items-stretch gap-4 rounded-lg border bg-card p-4">
      {/* Date block */}
      <div
        className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-md"
        style={{ background: formatColors.bg, color: formatColors.text }}
      >
        <span className="text-[11px] font-bold uppercase tracking-wide">{dateMonth}</span>
        <span className="font-heading text-2xl font-semibold leading-none">{dateDay}</span>
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <CategoryPill hue={formatHue}>{formatLabel}</CategoryPill>
          <Badge className={`text-xs px-2 py-0.5 ${statusBadge(event.status)}`}>
            {event.status}
          </Badge>
          <h4 className="text-[18px] font-semibold text-foreground leading-tight">{event.title}</h4>
        </div>
        {event.description && (
          <p className="text-[14.5px] text-muted-foreground line-clamp-2 leading-normal">{event.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatDate(event.startDate)}
          </span>
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {event.location}
            </span>
          )}
          {event.isVirtual && event.meetingUrl && event.status !== "completed" && (
            <a href={event.meetingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
              <Video className="w-3.5 h-3.5" /> Join Meeting
            </a>
          )}
          {event.replayUrl && (
            <a href={event.replayUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-600 hover:underline font-medium">
              <PlayCircle className="w-3.5 h-3.5" /> Watch Replay
            </a>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {attendeeCount} attending
            {event.maxAttendees && ` / ${event.maxAttendees} max`}
          </span>
        </div>

        {user && event.status !== "completed" && event.status !== "cancelled" && (
          <div className="flex gap-2 pt-1 border-t border-border">
            <RsvpButton
              label="Going" icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              active={myRsvp?.status === "going"}
              activeClass="bg-green-500/10 text-green-600 border-green-500/30"
              onClick={() => onRsvp("going")}
            />
            <RsvpButton
              label="Maybe" icon={<HelpCircle className="w-3.5 h-3.5" />}
              active={myRsvp?.status === "maybe"}
              activeClass="bg-amber-500/10 text-amber-600 border-amber-500/30"
              onClick={() => onRsvp("maybe")}
            />
            <RsvpButton
              label="Can't Go" icon={<XCircle className="w-3.5 h-3.5" />}
              active={myRsvp?.status === "not_going"}
              activeClass="bg-red-500/10 text-red-600 border-red-500/30"
              onClick={() => onRsvp("not_going")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function RsvpButton({ label, icon, active, activeClass, onClick }: {
  label: string; icon: React.ReactNode; active: boolean; activeClass: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
        active ? activeClass : "border-border text-muted-foreground hover:bg-accent"
      }`}
    >
      {icon} {label}
    </button>
  );
}
