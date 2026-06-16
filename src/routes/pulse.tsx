import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, Fragment } from "react";
import { useAttendanceState } from "@/hooks/useAttendance";
import { tierOf } from "@/lib/permissions";
import { getRoster } from "@/lib/roster";
import {
  SLOTS,
  type SlotKey,
  type SlotDef,
  activeSlot,
  complianceFor,
  getEntries,
  orgComplianceToday,
  submitPulse,
  flushPulseSync,
  subscribe,
  todayISO,
} from "@/lib/pulse-store";
import { getEventsFor, todayKey } from "@/lib/attendance-store";
import { dayHealth, subscribeConsole } from "@/lib/console-store";
import { api } from "@/lib/api-client";
import { Avatar } from "@/components/Avatar";
import { Clock, Send, CheckCircle2, AlertCircle, ChevronRight, Sparkles, Upload, X, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/pulse")({
  component: PulsePage,
});

function PulsePage() {
  const { actor, events } = useAttendanceState();
  const isClockedIn = useMemo(() => {
    const today = todayKey();
    return events.some(e => e.employeeId === actor.id && todayKey(e.ts) === today);
  }, [events, actor.id]);
  const tier = tierOf(actor);
  const canSeeAll =
    tier === "leadership" || tier === "hr" || tier === "zone_leader" || tier === "leader";

  // re-render on store changes
  const [v, setV] = useState(0);
  useEffect(() => subscribe(() => setV((x) => x + 1)), []);
  // tick once a minute so the active slot stays current
  useEffect(() => {
    const i = setInterval(() => setV((x) => x + 1), 60_000);
    return () => clearInterval(i);
  }, []);

  const current = activeSlot();
  const mine = complianceFor(actor.id);
  const myEntries = useMemo(
    () => getEntries({ employeeId: actor.id, date: todayISO() }),
    [actor.id, v],
  );

  const [selected, setSelected] = useState<SlotKey>(current?.key ?? "slot1");
  useEffect(() => {
    if (current) setSelected(current.key);
  }, [current?.key]);

  const [viewImages, setViewImages] = useState<string[] | null>(null);

  if (canSeeAll) {
    return <AdminPulseView />;
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto space-y-6">
      {/* Hero */}
      <header className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-2">
              Gharpayy · Daily Pulse
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
              Three pulses. One brief. Every day.
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Submit each slot inside its window. Honesty over polish — your manager sees this in
              real time.
            </p>
          </div>
          {current ? (
            <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-right">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
                Open now
              </div>
              <div className="font-display text-lg font-semibold">{current.label}</div>
              <div className="font-mono text-xs text-muted-foreground">{current.window}</div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-right">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                No slot open
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Between windows — catch your breath.
              </div>
            </div>
          )}
        </div>

        {/* Today strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-6">
          {SLOTS.map((s) => {
            const done = mine.done.includes(s.key);
            const isActive = current?.key === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSelected(s.key)}
                className={`text-left rounded-xl border p-3 transition-all ${
                  selected === s.key
                    ? "border-primary bg-primary/10"
                    : done
                      ? "border-success/30 bg-success/5 hover:bg-success/10"
                      : isActive
                        ? "border-primary/40 bg-card hover:bg-primary/5"
                        : "border-border bg-card hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {s.key === "eod" ? "EOD" : s.key.replace("slot", "Slot ")}
                  </div>
                  {done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  ) : isActive ? (
                    <Clock className="h-3.5 w-3.5 text-primary animate-pulse" />
                  ) : (
                    <span className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="font-display text-sm font-semibold mt-1 truncate">
                  {s.label.split(" · ")[1] || s.label}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{s.window}</div>
              </button>
            );
          })}
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Submission */}
        <section className="lg:col-span-2">
          <SubmitCard slot={SLOTS.find((s) => s.key === selected)!} employeeId={actor.id} />

          {/* My day */}
          <div className="mt-6 rounded-2xl border border-border bg-card">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <div className="font-display font-semibold">
                  My day ·{" "}
                  {new Date().toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {myEntries.length} of 4 submitted
                </div>
              </div>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="divide-y divide-border">
              {SLOTS.map((s) => {
                const entry = myEntries.find((e) => e.slot === s.key);
                return (
                  <div key={s.key} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {s.label} · {s.window}
                      </div>
                      {entry ? (
                        <span
                          className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                            entry.onTime
                              ? "border-success/30 bg-success/10 text-success"
                              : "border-warning/30 bg-warning/10 text-warning"
                          }`}
                        >
                          {entry.onTime ? "On time" : "Late"}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Pending
                        </span>
                      )}
                    </div>
                    {entry ? (
                      <div className="text-sm text-foreground/90 whitespace-pre-wrap">
                        {entry.text}
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelected(s.key)}
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Write it now <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                    {entry && (entry.calls || entry.tours || entry.closures) ? (
                      <div className="flex gap-3 mt-2 text-xs font-mono text-muted-foreground">
                        {entry.calls != null && <span>{entry.calls} calls</span>}
                        {entry.tours != null && <span>{entry.tours} tours</span>}
                        {entry.closures != null && <span>{entry.closures} closures</span>}
                      </div>
                    ) : null}
                    {entry?.blockers && (
                      <div className="mt-2 text-xs rounded-md border border-destructive/20 bg-destructive/5 text-destructive px-2 py-1 inline-flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {entry.blockers}
                      </div>
                    )}
                    {entry?.mediaUrls && entry.mediaUrls.length > 0 && (
                      <div className="mt-3 flex gap-2 flex-wrap">
                        {entry.mediaUrls.map((url, idx) => (
                          <img 
                            key={idx} 
                            src={url} 
                            className="h-12 w-12 object-cover rounded border border-border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setViewImages(entry.mediaUrls || null)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {myEntries.length === 0 && !isClockedIn && (
            <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-5 flex gap-3 shadow-sm">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-destructive">You are currently marked as Absent</h3>
                <p className="text-sm text-destructive/90 mt-1">
                  You have not clocked in or submitted any pulse updates today. Please log your progress to correct your attendance status.
                </p>
              </div>
            </div>
          )}
          {myEntries.length === 0 && isClockedIn && (
            <div className="mt-6 rounded-2xl border border-warning/30 bg-warning/10 p-5 flex gap-3 shadow-sm">
              <Clock className="h-5 w-5 text-warning-foreground shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-warning-foreground">Missing Pulses</h3>
                <p className="text-sm text-warning-foreground/90 mt-1">
                  You have clocked in but haven't submitted any pulse updates today. Please log your progress.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Right rail */}
        <aside className="space-y-6">
          <MyComplianceCard mine={mine} />
          {canSeeAll && <OrgComplianceCard />}
        </aside>
      </div>

      {viewImages && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-start p-4 md:p-10 backdrop-blur-sm cursor-pointer overflow-y-auto"
          onClick={() => setViewImages(null)}
        >
          <div className="relative max-w-5xl w-full flex flex-col items-center gap-8 py-10 my-auto" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setViewImages(null)}
              className="sticky top-4 self-end md:-mr-12 bg-secondary text-foreground rounded-full p-2 hover:bg-destructive hover:text-white transition-colors z-10 shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>
            {viewImages.map((url, idx) => (
              <img key={idx} src={url} alt={`Proof of Work ${idx+1}`} className="max-w-full max-h-[85vh] rounded-md shadow-2xl object-contain bg-black" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SubmitCard({ slot, employeeId }: { slot: SlotDef; employeeId: string }) {
  const existing = getEntries({ employeeId, date: todayISO(), slot: slot.key })[0];
  const [text, setText] = useState(existing?.text || "");
  const [calls, setCalls] = useState<string>(existing?.calls?.toString() || "");
  const [tours, setTours] = useState<string>(existing?.tours?.toString() || "");
  const [closures, setClosures] = useState<string>(existing?.closures?.toString() || "");
  const [blockers, setBlockers] = useState(existing?.blockers || "");
  const [mediaUrls, setMediaUrls] = useState<string[]>(existing?.mediaUrls || []);
  const [saved, setSaved] = useState(false);
  const [polishing, setPolishing] = useState(false);

  const handleAIPolish = async () => {
    if (slot.key !== "eod" && !text.trim()) return;
    setPolishing(true);
    try {
      let mode = "polish_pulse";
      let contextStr = text;
      
      if (slot.key === "eod") {
        mode = "generate_eod";
        const earlierEntries = getEntries({ employeeId, date: todayISO() }).filter(e => e.slot !== "eod");
        contextStr = earlierEntries.map(e => `[${e.slot}]: ${e.text}`).join("\n\n");
      }

      const res = await api.post<{ text: string }>("/ai/template", {
        mode,
        context: contextStr
      });
      if (res && res.text) {
        setText(res.text);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPolishing(false);
    }
  };

  useEffect(() => {
    const e = getEntries({ employeeId, date: todayISO(), slot: slot.key })[0];
    setText(e?.text || "");
    setCalls(e?.calls?.toString() || "");
    setTours(e?.tours?.toString() || "");
    setClosures(e?.closures?.toString() || "");
    setBlockers(e?.blockers || "");
    setMediaUrls(e?.mediaUrls || []);
    setSaved(false);
  }, [slot.key, employeeId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const promises = files.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            if (ev.target?.result) {
              resolve(ev.target.result as string);
            }
          };
          reader.readAsDataURL(file);
        });
      });
      Promise.all(promises).then(urls => {
        setMediaUrls(prev => [...prev, ...urls]);
      });
    }
  }

  function submit() {
    if (!text.trim()) return;
    submitPulse({
      employeeId,
      slot: slot.key,
      text,
      calls: calls ? Number(calls) : undefined,
      tours: tours ? Number(tours) : undefined,
      closures: closures ? Number(closures) : undefined,
      blockers,
      mediaUrls,
    });
    // Immediately flush to MongoDB so data persists across refresh
    void flushPulseSync();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-card to-primary/5">
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
          {slot.window}
        </div>
        <div className="font-display text-xl font-semibold mt-0.5">{slot.label}</div>
        <div className="text-sm text-muted-foreground mt-1">{slot.prompt}</div>
      </div>
      <div className="p-5 space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Type it the way you'd say it on a call. No fluff."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
        <div className="flex justify-end mt-[-8px]">
          <button
            onClick={handleAIPolish}
            disabled={(slot.key !== "eod" && !text.trim()) || polishing}
            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-600 hover:bg-purple-500 hover:text-white transition-colors disabled:opacity-50 font-medium"
          >
            <Sparkles className="h-3 w-3" />
            {polishing ? (slot.key === "eod" ? "Generating..." : "Polishing...") : (slot.key === "eod" ? "Auto-fill EOD" : "AI Polish")}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <NumberField label="Calls" value={calls} onChange={setCalls} />
          <NumberField label="Tours" value={tours} onChange={setTours} />
          <NumberField label="Closures" value={closures} onChange={setClosures} />
        </div>
        <input
          value={blockers}
          onChange={(e) => setBlockers(e.target.value)}
          placeholder="Anything blocked? (optional)"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">Proof of Work (optional)</label>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-xs bg-secondary/50 hover:bg-secondary transition-colors">
              <Upload className="h-3.5 w-3.5" /> Upload Screenshot(s)
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
            </label>
            {mediaUrls.length > 0 && <span className="text-xs text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {mediaUrls.length} uploaded</span>}
          </div>
          {mediaUrls.length > 0 && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {mediaUrls.map((url, idx) => (
                <div key={idx} className="relative inline-block">
                  <img src={url} className="h-16 w-16 object-cover rounded border border-border" />
                  <button 
                    onClick={() => setMediaUrls(prev => prev.filter((_, i) => i !== idx))} 
                    className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-0.5 hover:bg-destructive hover:text-white transition-colors"
                  >
                    <X className="h-3 w-3"/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-muted-foreground">
            {existing
              ? `Last saved · ${new Date(existing.submittedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
              : "Not submitted yet"}
          </div>
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-3.5 w-3.5" />{" "}
            {saved ? "Saved" : existing ? "Update" : "Submit pulse"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const num = parseInt(value || "0", 10);
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </div>
      <div className="flex items-center gap-2 w-full min-w-0">
        <button
          onClick={() => onChange(String(Math.max(0, num - 1)))}
          className="h-10 w-10 flex-shrink-0 rounded-xl border border-border hover:bg-secondary text-lg leading-none"
          aria-label={`decrease ${label}`}
        >
          −
        </button>
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="h-10 flex-1 min-w-0 text-center text-lg font-semibold bg-background border border-border rounded-xl px-2"
        />
        <button
          onClick={() => onChange(String(num + 1))}
          className="h-10 w-10 flex-shrink-0 rounded-xl border border-border hover:bg-secondary text-lg leading-none"
          aria-label={`increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function MyComplianceCard({ mine }: { mine: { done: SlotKey[]; missing: SlotKey[] } }) {
  const rate = Math.round((mine.done.length / SLOTS.length) * 100);
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="font-display font-semibold">My compliance</div>
      <div className="text-xs text-muted-foreground">Today's submission rate</div>
      <div className="mt-3 flex items-end gap-2">
        <div className="font-display text-4xl font-semibold tabular-nums">
          {rate}
          <span className="text-xl text-muted-foreground">%</span>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          {mine.done.length} of {SLOTS.length}
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
        <div
          className="h-full bg-gradient-to-r from-primary to-warning transition-all"
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  );
}

function OrgComplianceCard() {
  const rows = orgComplianceToday();
  const avg = Math.round(rows.reduce((a, r) => a + r.rate, 0) / Math.max(rows.length, 1));
  const lagging = rows.filter((r) => r.rate < 100).slice(0, 6);
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display font-semibold">Org pulse</div>
            <div className="text-xs text-muted-foreground">Live · today</div>
          </div>
          <div className="font-display text-2xl font-semibold tabular-nums">
            {avg}
            <span className="text-base text-muted-foreground">%</span>
          </div>
        </div>
      </div>
      <div className="divide-y divide-border max-h-80 overflow-y-auto">
        {lagging.length === 0 ? (
          <div className="p-5 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-6 w-6 text-success mx-auto mb-2" />
            Everyone is on track.
          </div>
        ) : (
          lagging.map((r) => (
            <div key={r.employeeId} className="px-5 py-3 flex items-center gap-3">
              <Avatar id={r.employeeId} size={28} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{r.name}</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground truncate">
                  {r.role} · {r.team}
                </div>
              </div>
              <div
                className={`font-mono text-xs tabular-nums ${r.rate < 50 ? "text-destructive" : r.rate < 80 ? "text-warning" : "text-foreground"}`}
              >
                {r.rate}%
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function AdminPulseView({ isEmbedded }: { isEmbedded?: boolean }) {
  const { events: attendanceEvents } = useAttendanceState();
  const [v, setV] = useState(0);
  const [copied, setCopied] = useState(false);
  const [viewImages, setViewImages] = useState<string[] | null>(null);
  const [isExternalView, setIsExternalView] = useState(false);
  useEffect(() => {
    const unsubPulse = subscribe(() => setV((x) => x + 1));
    const unsubConsole = subscribeConsole(() => setV((x) => x + 1));
    return () => {
      unsubPulse();
      unsubConsole();
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewMediaId = params.get("viewMedia");
    if (viewMediaId) {
      const allEntries = getEntries({});
      const entry = allEntries.find((e) => e.id === viewMediaId);
      if (entry && entry.mediaUrls && entry.mediaUrls.length > 0) {
        setViewImages(entry.mediaUrls);
        setIsExternalView(true);
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const closeViewer = () => {
    setViewImages(null);
    if (isExternalView) {
      window.close();
    }
  };

  const entries = useMemo(() => getEntries({ date: todayISO() }), [v]);

  const groupedEntries = useMemo(() => {
    const groups: Record<string, typeof entries> = {};
    const roster = getRoster();
    for (const e of entries) {
      const linked = roster.find(r => r.id === e.employeeId);
      const eTier = linked ? tierOf(linked) : "teammate";
      if (eTier === "leadership" || eTier === "hr" || eTier === "zone_leader" || eTier === "leader") continue;
      if (!groups[e.employeeId]) groups[e.employeeId] = [];
      groups[e.employeeId].push(e);
    }
    const slotOrder: Record<string, number> = { slot1: 1, slot2: 2, slot3: 3, eod: 4 };
    Object.values(groups).forEach(g => g.sort((a,b) => (slotOrder[a.slot] || 99) - (slotOrder[b.slot] || 99)));
    
    return Object.values(groups).map(empEntries => {
      const eodEntry = empEntries.find(e => e.slot === "eod");
      const regularEntries = empEntries.filter(e => e.slot !== "eod");
      return {
        empId: empEntries[0].employeeId,
        empName: empEntries[0].employeeName,
        role: empEntries[0].role,
        team: empEntries[0].team,
        eodEntry,
        regularEntries: regularEntries.length > 0 ? regularEntries : [null]
      };
    });
  }, [entries]);

  const { absentEmployees, missingPulseEmployees } = useMemo(() => {
    const roster = getRoster();
    const submittedIds = new Set(groupedEntries.map(g => g.empId));
    
    const absent: typeof roster = [];
    const missing: typeof roster = [];
    
    const today = todayKey();
    
    roster.forEach(emp => {
      const tier = tierOf(emp);
      // Exclude Admin, HR, and Managers
      if (tier === "leadership" || tier === "hr" || tier === "zone_leader" || tier === "leader") return;
      
      if (!submittedIds.has(emp.id)) {
        const hasAttendance = attendanceEvents.some(e => e.employeeId === emp.id && todayKey(e.ts) === today);
        if (hasAttendance) {
          missing.push(emp);
        } else {
          absent.push(emp);
        }
      }
    });
    
    return { absentEmployees: absent, missingPulseEmployees: missing };
  }, [groupedEntries, attendanceEvents]);

  function copyToClipboard() {
    const headers = [
      "Name",
      "Role",
      "Team",
      "Slot",
      "Time",
      "Status",
      "Calls",
      "Tours",
      "Closures",
      "Blockers",
      "Pulse Text",
      "Proof of Work",
      "EOD Time",
      "EOD Status",
      "EOD Brief",
      "EOD Blockers"
    ];

    const rows: string[][] = [];
    let bodyHtml = "";

    groupedEntries.forEach((group) => {
      const eodTime = group.eodEntry ? new Date(group.eodEntry.submittedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";
      const eodStatus = group.eodEntry ? (group.eodEntry.onTime ? "On Time" : "Late") : "Pending";
      const eodText = group.eodEntry ? group.eodEntry.text.replace(/\n/g, " ") : "";
      const eodBlockers = group.eodEntry?.blockers ? group.eodEntry.blockers.replace(/\n/g, " ") : "";
      
      const rowCount = group.regularEntries.length;

      group.regularEntries.forEach((e, idx) => {
        // --- TSV Fallback ---
        const name = group.empName;
        const role = group.role;
        const team = group.team;
        const outEodTime = idx === 0 ? eodTime : "";
        const outEodStatus = idx === 0 ? eodStatus : "";
        const outEodText = idx === 0 ? eodText : "";
        const outEodBlockers = idx === 0 ? eodBlockers : "";

        if (e) {
          let slotLabel: string = e.slot;
          const slotObj = SLOTS.find((s) => s.key === e.slot);
          if (slotObj) {
            const parts = slotObj.label.split(" · ");
            slotLabel = parts.length > 1 ? `${parts[0]} (${parts[1]})` : slotObj.label;
          }
          
          const health = dayHealth(group.empId);
          
          rows.push([
            name, role, team,
            slotLabel,
            new Date(e.submittedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
            e.onTime ? "On Time" : "Late",
            e.calls?.toString() || "", e.tours?.toString() || "", e.closures?.toString() || "",
            e.blockers?.replace(/\n/g, " ") || "", e.text.replace(/\n/g, " "),
            e.mediaUrls?.length ? `[${e.mediaUrls.length} Image(s) Uploaded]` : "",
            outEodTime, outEodStatus, outEodText, outEodBlockers
          ]);
        } else {
          rows.push([name, role, team, "No intraday slots", "", "", "", "", "", "", "", "", outEodTime, outEodStatus, outEodText, outEodBlockers]);
        }

        // --- HTML Table Generation with Styling and Rowspans ---
        let htmlRow = `<tr>`;
        const cellStyle = `border: 1px solid #d1d5db; padding: 8px; vertical-align: top;`;
        const textStyle = `border: 1px solid #d1d5db; padding: 8px; vertical-align: top; width: 300px; white-space: pre-wrap; word-wrap: break-word;`;
        const eodStyle = `border: 1px solid #d1d5db; border-left: 2px solid #9ca3af; padding: 8px; vertical-align: top; background-color: #f8fafc;`;
        const eodTextStyle = `border: 1px solid #d1d5db; border-left: 2px solid #9ca3af; padding: 8px; vertical-align: top; background-color: #f8fafc; width: 300px; white-space: pre-wrap; word-wrap: break-word;`;
        
        htmlRow += `<td style="${cellStyle} font-weight: bold; background-color: #ffffff;">${group.empName}</td>`;
        htmlRow += `<td style="${cellStyle} background-color: #ffffff;">${group.role}</td>`;
        htmlRow += `<td style="${cellStyle} background-color: #ffffff;">${group.team}</td>`;

        if (e) {
          let slotLabel: string = e.slot;
          const slotObj = SLOTS.find((s) => s.key === e.slot);
          if (slotObj) {
            const parts = slotObj.label.split(" · ");
            slotLabel = parts.length > 1 ? `${parts[0]} (${parts[1]})` : slotObj.label;
          }
          const time = new Date(e.submittedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
          const statusColor = e.onTime ? '#16a34a' : '#ea580c';
          htmlRow += `<td style="${cellStyle} white-space: nowrap; width: 250px; min-width: 250px;">${slotLabel}</td>`;
          htmlRow += `<td style="${cellStyle}">${time}</td>`;
          htmlRow += `<td style="${cellStyle} color: ${statusColor}; font-weight: bold;">${e.onTime ? "On Time" : "Late"}</td>`;
          htmlRow += `<td style="${cellStyle}">${e.calls?.toString() || ""}</td>`;
          htmlRow += `<td style="${cellStyle}">${e.tours?.toString() || ""}</td>`;
          htmlRow += `<td style="${cellStyle}">${e.closures?.toString() || ""}</td>`;
          htmlRow += `<td style="${cellStyle}">${e.blockers?.replace(/\n/g, " ") || ""}</td>`;
          htmlRow += `<td style="${textStyle}">${e.text}</td>`;
          const origin = window.location.origin;
          const path = window.location.pathname;
          const mediaLinks = e.mediaUrls?.length ? `<a href="${origin}${path}?viewMedia=${e.id}" target="_blank">View ${e.mediaUrls.length} Image(s)</a>` : "";
          htmlRow += `<td style="${cellStyle}">${mediaLinks}</td>`;
        } else {
          htmlRow += `<td colspan="9" style="${cellStyle} color: #6b7280; font-style: italic; text-align: center;">No intraday slots submitted</td>`;
        }

        if (idx === 0) {
          const eodStatusColor = group.eodEntry?.onTime ? '#16a34a' : group.eodEntry ? '#ea580c' : '#6b7280';
          htmlRow += `<td rowspan="${rowCount}" style="${eodStyle}">${eodTime}</td>`;
          htmlRow += `<td rowspan="${rowCount}" style="${eodStyle} color: ${eodStatusColor}; font-weight: bold;">${eodStatus}</td>`;
          htmlRow += `<td rowspan="${rowCount}" style="${eodTextStyle}">${group.eodEntry?.text || ""}</td>`;
          htmlRow += `<td rowspan="${rowCount}" style="${eodStyle}">${eodBlockers}</td>`;
        }
        htmlRow += `</tr>`;
        bodyHtml += htmlRow;
      });
    });
    
    const tsv = [headers, ...rows].map((row) => row.join("\t")).join("\n");
    
    const headerHtml = `<tr>${headers.map((h, i) => {
      const isEod = i >= headers.length - 4;
      const isLongText = h === "Pulse Text" || h === "EOD Brief" || h === "Blockers" || h === "EOD Blockers";
      let style = isLongText ? 'width: 300px; min-width: 300px;' : 'white-space: nowrap;';
      if (h === "Slot") style = 'width: 250px; min-width: 250px; white-space: nowrap;';
      return `<th style="border: 1px solid #d1d5db; ${isEod ? 'border-left: 2px solid #9ca3af; background-color: #e2e8f0;' : 'background-color: #f3f4f6;'} padding: 10px 8px; font-weight: bold; text-align: left; font-family: sans-serif; ${style}">${h}</th>`;
    }).join("")}</tr>`;
    
    const html = `<table style="border-collapse: collapse; font-family: sans-serif; font-size: 14px;"><thead>${headerHtml}</thead><tbody>${bodyHtml}</tbody></table>`;

    try {
      const textBlob = new Blob([tsv], { type: "text/plain" });
      const htmlBlob = new Blob([html], { type: "text/html" });
      const clipboardItem = new ClipboardItem({
        "text/plain": textBlob,
        "text/html": htmlBlob,
      });
      navigator.clipboard.write([clipboardItem]);
    } catch (e) {
      // Fallback for older browsers
      navigator.clipboard.writeText(tsv);
    }
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={isEmbedded ? "space-y-6" : "px-4 md:px-8 py-6 max-w-7xl mx-auto space-y-6"}>
      {isEmbedded ? (
        <div className="flex justify-end">
          <button
            onClick={copyToClipboard}
            className="inline-flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
          >
            {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy as Excel"}
          </button>
        </div>
      ) : (
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-2">
              Gharpayy · Daily Pulse
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
              Organization Pulses
            </h1>
            <p className="text-muted-foreground mt-2">
              Live feed of all daily pulses across the organization.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={copyToClipboard}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              {copied ? <CheckCircle2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {copied ? "Copied to clipboard" : "Copy as Excel"}
            </button>
          </div>
        </header>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-sm text-left whitespace-nowrap min-w-[1500px]">
            <thead className="bg-muted/50 text-muted-foreground text-xs font-semibold tracking-wider border-b border-border">
              <tr>
                <th className="px-3 py-3 border-r border-border/20">Name</th>
                <th className="px-3 py-3 border-r border-border/20">Role</th>
                <th className="px-3 py-3 border-r border-border/20">Team</th>
                <th className="px-3 py-3 border-r border-border/20">Slot</th>
                <th className="px-3 py-3 border-r border-border/20">Time</th>
                <th className="px-3 py-3 border-r border-border/20">Status</th>
                <th className="px-3 py-3 border-r border-border/20 text-right">Calls</th>
                <th className="px-3 py-3 border-r border-border/20 text-right">Tours</th>
                <th className="px-3 py-3 border-r border-border/20 text-right">Closures</th>
                <th className="px-3 py-3 border-r border-border/20 min-w-[150px]">Blockers</th>
                <th className="px-3 py-3 border-r border-border/20 min-w-[200px]">Pulse Text</th>
                <th className="px-3 py-3 border-r border-border/20">Proof of Work</th>
                <th className="px-3 py-3 border-r border-border/20">EOD Time</th>
                <th className="px-3 py-3 border-r border-border/20">EOD Status</th>
                <th className="px-3 py-3 border-r border-border/20 min-w-[200px]">EOD Brief</th>
                <th className="px-3 py-3 min-w-[150px]">EOD Blockers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {groupedEntries.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-6 py-8 text-center text-muted-foreground">
                    No pulses submitted yet today.
                  </td>
                </tr>
              ) : (
                groupedEntries.map((group) => (
                  <Fragment key={group.empId}>
                    {group.regularEntries.map((e, idx) => (
                      <tr key={e?.id || `empty-${group.empId}-${idx}`} className={`hover:bg-muted/30 transition-colors ${idx === group.regularEntries.length - 1 ? "border-b-2 border-border" : ""}`}>
                        <td className="px-3 py-2 align-top font-medium text-foreground border-r border-border/20">
                          {group.empName}
                        </td>
                        <td className="px-3 py-2 align-top text-muted-foreground border-r border-border/20">
                          {group.role}
                        </td>
                        <td className="px-3 py-2 align-top text-muted-foreground border-r border-border/20">
                          {group.team}
                        </td>
                        
                        {e ? (
                          <>
                            <td className="px-3 py-2 align-top border-r border-border/20 text-foreground/90">
                              {SLOTS.find((s) => s.key === e.slot)?.label.split(" · ")[0] || e.slot}
                              <span className="text-muted-foreground ml-1 text-xs">
                                ({SLOTS.find((s) => s.key === e.slot)?.window})
                              </span>
                            </td>
                            <td className="px-3 py-2 align-top text-foreground/90 border-r border-border/20 text-right">
                              {new Date(e.submittedAt).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className={`px-3 py-2 align-top font-medium border-r border-border/20 ${e.onTime ? "text-success" : "text-destructive"}`}>
                              {e.onTime ? "On Time" : "Late"}
                            </td>
                            <td className="px-3 py-2 align-top text-right tabular-nums border-r border-border/20">
                              {e.calls ?? ""}
                            </td>
                            <td className="px-3 py-2 align-top text-right tabular-nums border-r border-border/20">
                              {e.tours ?? ""}
                            </td>
                            <td className="px-3 py-2 align-top text-right tabular-nums border-r border-border/20">
                              {e.closures ?? ""}
                            </td>
                            <td className="px-3 py-2 align-top whitespace-pre-wrap break-words border-r border-border/20 text-foreground/90">
                              {e.blockers ?? ""}
                            </td>
                            <td className="px-3 py-2 align-top whitespace-pre-wrap break-words border-r border-border/20 text-foreground/90 text-xs">
                              {e.text}
                            </td>
                            <td className="px-3 py-2 align-top border-r border-border/20">
                              {e.mediaUrls && e.mediaUrls.length > 0 ? (
                                <button
                                  onClick={() => setViewImages(e.mediaUrls!)}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-medium rounded transition-colors"
                                >
                                  <ImageIcon className="h-3 w-3" /> View {e.mediaUrls.length > 1 ? `(${e.mediaUrls.length})` : ""}
                                </button>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                          </>
                        ) : (
                          <td colSpan={9} className="px-3 py-2 text-muted-foreground italic border-r border-border/20">
                            No intraday slots submitted yet.
                          </td>
                        )}

                        {idx === 0 ? (
                          <>
                            {group.eodEntry ? (
                              <>
                                <td rowSpan={group.regularEntries.length} className="px-3 py-2 align-top border-r border-border/20 text-foreground/90 text-right">
                                  {new Date(group.eodEntry.submittedAt).toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </td>
                                <td rowSpan={group.regularEntries.length} className={`px-3 py-2 align-top font-medium border-r border-border/20 ${group.eodEntry.onTime ? "text-success" : "text-destructive"}`}>
                                  {group.eodEntry.onTime ? "On Time" : "Late"}
                                </td>
                                <td rowSpan={group.regularEntries.length} className="px-3 py-2 align-top whitespace-pre-wrap break-words border-r border-border/20 text-foreground/90 text-xs">
                                  {group.eodEntry.text}
                                </td>
                                <td rowSpan={group.regularEntries.length} className="px-3 py-2 align-top whitespace-pre-wrap break-words text-foreground/90">
                                  {group.eodEntry.blockers ?? ""}
                                </td>
                              </>
                            ) : (
                              <td colSpan={4} rowSpan={group.regularEntries.length} className="px-3 py-2 align-top text-muted-foreground italic opacity-70">
                                Pending EOD
                              </td>
                            )}
                          </>
                        ) : null}
                      </tr>
                    ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {absentEmployees.length > 0 && (
        <div className="mt-8 border border-destructive/20 bg-destructive/5 rounded-2xl p-6">
          <div className="flex items-center gap-2 text-destructive font-semibold mb-4">
            <AlertCircle className="h-5 w-5" />
            <h3>Absent Today</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {absentEmployees.map(emp => (
              <div key={emp.id} className="flex items-center gap-3 bg-card border border-border p-3 rounded-xl shadow-sm">
                <Avatar id={emp.id} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate text-foreground">{emp.name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground truncate">
                    {emp.role} · {emp.team}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewImages && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-start p-4 md:p-10 backdrop-blur-sm cursor-pointer overflow-y-auto"
          onClick={closeViewer}
        >
          <div className="relative max-w-5xl w-full flex flex-col items-center gap-8 py-10 my-auto" onClick={e => e.stopPropagation()}>
            <button 
              onClick={closeViewer}
              className="sticky top-4 self-end md:-mr-12 bg-secondary text-foreground rounded-full p-2 hover:bg-destructive hover:text-white transition-colors z-10 shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>
            {viewImages.map((url, idx) => (
              <img key={idx} src={url} alt={`Proof of Work ${idx+1}`} className="max-w-full max-h-[85vh] rounded-md shadow-2xl object-contain bg-black" />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
