import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield,
  ShieldOff,
  Flame,
  Plus,
  Check,
  Clock,
  MessageSquare,
  Copy,
  Send,
  AlertTriangle,
  Zap,
  FileText,
  ChevronRight,
  Gavel,
  Sparkles,
  Activity,
  Target,
} from "lucide-react";
import { useRoleFeature } from "@/hooks/useRoleFeature";
import { useAttendanceState } from "@/hooks/useAttendance";
import { tierOf, hasConsoleCapability } from "@/lib/permissions";
import {
  playbookStore,
  playbookFor,
  fmtMin,
  nowMin,
  type RolePlaybook,
  type PlaybookKey,
} from "@/lib/playbooks-store";
import {
  useConsoleDay,
  toggleSprint,
  markWindowSent,
  setEod,
  logDecision,
  shieldNow,
  currentSprint,
  nextSprint,
  exportEodText,
} from "@/lib/console-store";
import { useTasks, tasksFor, setStatus } from "@/lib/task-store";
import type { AppTask } from "@/types/hr";
import { Avatar } from "@/components/Avatar";
import type { Employee } from "@/types/hr";
import { TeamIntelligencePanel } from "@/components/TeamIntelligencePanel";
import { LeadershipActionsPanel } from "@/components/LeadershipActionsPanel";
import {
  fetchKpiDefinitions,
  fetchKpiTargets,
  type KpiDefinition,
  type KpiTarget,
} from "@/lib/kpi-governance-api";

export const Route = createFileRoute("/console")({
  component: ConsolePage,
  head: () => ({
    meta: [
      { title: "Operator Console — Gharpayy Arena" },
      {
        name: "description",
        content: "Sprint-by-sprint execution console for Gharpayy operators.",
      },
    ],
  }),
});

function useDynamicPlaybook(pb: RolePlaybook | undefined, actor: Employee) {
  const [definitions, setDefinitions] = useState<KpiDefinition[]>([]);
  const [targets, setTargets] = useState<KpiTarget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [kpiRes, targetRes] = await Promise.all([
          fetchKpiDefinitions({ active: true }),
          fetchKpiTargets(),
        ]);
        if (kpiRes?.definitions) setDefinitions(kpiRes.definitions);
        if (targetRes?.targets) setTargets(targetRes.targets);
      } catch (err) {
        console.error("Failed to load dynamic playbook KPIs", err);
      } finally {
        setLoading(false);
      }
    }
    if (pb && actor?.id && actor.id !== "loading") {
      load();
    } else {
      setLoading(false);
    }
  }, [pb?.key, actor?.id]);

  const dynamicPb = useMemo(() => {
    if (!pb) return undefined;
    if (loading || definitions.length === 0) return pb;

    const dynamicKpis = pb.kpis.map((legacyKpi: any) => {
      const expectedSlug = `${pb.id}_${legacyKpi.id}`;
      const definition = definitions.find((d) => d.slug === expectedSlug);

      if (!definition) {
        return legacyKpi;
      }

      const kpiTargets = targets.filter((t) => t.kpiId === definition.id);

      let resolvedTarget = legacyKpi.target;

      const individualTarget = kpiTargets.find(
        (t) => t.scopeType === "individual" && t.scopeId === actor.id,
      );
      const teamTarget = kpiTargets.find(
        (t) =>
          t.scopeType === "team" &&
          actor.team &&
          t.scopeId?.toLowerCase() === actor.team.toLowerCase(),
      );
      const zoneTarget = kpiTargets.find(
        (t) =>
          t.scopeType === "zone" &&
          actor.zone &&
          t.scopeId?.toLowerCase() === actor.zone.toLowerCase(),
      );
      const orgTarget = kpiTargets.find((t) => t.scopeType === "org");

      if (individualTarget !== undefined) {
        resolvedTarget = individualTarget.targetValue;
      } else if (teamTarget !== undefined) {
        resolvedTarget = teamTarget.targetValue;
      } else if (zoneTarget !== undefined) {
        resolvedTarget = zoneTarget.targetValue;
      } else if (orgTarget !== undefined) {
        resolvedTarget = orgTarget.targetValue;
      }

      return {
        id: legacyKpi.id,
        label: definition.name || legacyKpi.label,
        why: definition.description || legacyKpi.why,
        target: resolvedTarget,
        unit:
          definition.unit === "count"
            ? undefined
            : definition.unit === "percent"
              ? "%"
              : definition.unit,
        kind:
          definition.unit === "percent"
            ? "percent"
            : definition.unit === "boolean"
              ? "boolean"
              : legacyKpi.kind,
      };
    });

    return {
      ...pb,
      kpis: dynamicKpis,
    };
  }, [pb, definitions, targets, actor, loading]);

  return { pb: dynamicPb, loading };
}

function calculateDynamicHealth(
  kpis: Array<{ id: string; kind: string; target: number }>,
  dayKpis: Record<string, number>,
) {
  if (!kpis || kpis.length === 0) return { score: 0, label: "—" };
  let hit = 0;
  kpis.forEach((k) => {
    const v = dayKpis[k.id] ?? 0;
    if (k.kind === "boolean") {
      if (v >= 1) hit++;
    } else if (k.kind === "percent") {
      if (v >= k.target) hit++;
    } else {
      if (v >= k.target) hit++;
    }
  });
  const score = Math.round((hit / kpis.length) * 100);
  const label =
    score >= 90 ? "On fire" : score >= 70 ? "On track" : score >= 40 ? "Behind" : "Red zone";
  return { score, label };
}

function ConsolePage() {
  const { actor } = useAttendanceState();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(i);
  }, []);
  // tick referenced to avoid unused warnings; force re-render every 30s
  void tick;

  const hasMyOps = hasConsoleCapability(actor, "access_playbooks");
  const hasTeamIntel = hasConsoleCapability(actor, "view_team_intelligence");
  const hasLeadActions = hasConsoleCapability(actor, "manage_workforce_interventions");

  // Resolve playbook BEFORE any early returns so hook call count is stable
  const playbookKey = actor.role.toLowerCase().replace(/\s+/g, "_");
  const staticPb = playbookFor(playbookKey);
  const { pb, loading } = useDynamicPlaybook(staticPb, actor);

  // Initial loading while actor data is being fetched
  if (actor.id === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground gap-2">
        <Activity className="h-5 w-5 animate-pulse text-primary" />
        <span className="text-sm font-mono uppercase tracking-widest">Loading Console…</span>
      </div>
    );
  }

  // While the dynamic playbook is loading, show the same loading UI
  if (hasMyOps && loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground gap-2">
        <Activity className="h-5 w-5 animate-pulse text-primary" />
        <span className="text-sm font-mono uppercase tracking-widest">Loading Console…</span>
      </div>
    );
  }

  // Permission check after data is ready
  if (!hasMyOps && !hasTeamIntel && !hasLeadActions) {
    return (
      <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto">
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <ShieldOff className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h1 className="font-display text-xl font-semibold mb-2">Access Denied</h1>
          <p className="text-sm text-muted-foreground">You do not have permissions to access the Operations Command Center.</p>
        </div>
      </div>
    );
  }

  // Render the main console UI
  return (
    <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto space-y-8">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center border border-primary/20">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Operations Command Center</h1>
          <p className="text-xs text-muted-foreground">Real-time execution rhythm and intelligence</p>
        </div>
      </div>
          {hasMyOps && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              01 / My Operations
            </span>
          </div>
          {pb ? (
            <MyOperationsSection pb={pb} actorId={actor.id} actorName={actor.name} actor={actor} />
          ) : (
            <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between bg-gradient-to-r from-card to-secondary/15">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Operator Playbook</h2>
                  <p className="text-xs text-muted-foreground">
                    No operator playbook assigned for execution workflows.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {hasTeamIntel && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              02 / Team Intelligence
            </span>
          </div>
          <TeamIntelligencePanel actor={actor} />
        </div>
      )}
      {hasLeadActions && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              03 / Leadership Actions
            </span>
          </div>
          <LeadershipActionsPanel actor={actor} />
        </div>
      )}
    </div>
  );
}

function MyOperationsSection({
  pb,
  actorId,
  actorName,
  actor,
}: {
  pb: RolePlaybook;
  actorId: string;
  actorName: string;
  actor: ReturnType<typeof useAttendanceState>["actor"];
}) {
  const day = useConsoleDay(actorId);
  const shield = shieldNow(actorId);
  const sprint = currentSprint(actorId);
  const next = nextSprint(actorId);
  const health = useMemo(() => {
    return calculateDynamicHealth(pb.kpis, day.kpis);
  }, [pb.kpis, day.kpis]);

  const allTasks = useTasks();
  const myTasks = useMemo(() => allTasks.filter(t => t.assigneeId === actorId), [allTasks, actorId]);

  return (
    <div className="space-y-6">
      <Header pb={pb} actorName={actorName} health={health} shield={shield} />
      <NowStrip actorId={actorId} sprint={sprint} next={next} />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {hasConsoleCapability(actor, "manage_personal_sprint") && (
            <SprintTimeline pb={pb} actorId={actorId} day={day} tasks={myTasks} />
          )}
          {hasConsoleCapability(actor, "manage_comm_windows") && (
            <CommWindows pb={pb} actorId={actorId} day={day} />
          )}
        </div>
        <div className="space-y-6">
          <CollapseRule pb={pb} />
          <DecisionsLog actorId={actorId} day={day} />
          {hasConsoleCapability(actor, "submit_eod") && (
            <EodGenerator pb={pb} actorId={actorId} day={day} />
          )}
        </div>
      </div>
    </div>
  );
}

function Header({
  pb,
  actorName,
  health,
  shield,
}: {
  pb: RolePlaybook;
  actorName: string;
  health: { score: number; label: string };
  shield: { active: boolean; label: string; until?: number };
}) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-secondary/30 p-5 md:p-6">
      <div className="flex flex-wrap items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Flame className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
            {pb.subtitle}
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold leading-tight">
            {pb.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{pb.oneLiner}</p>
          <p className="text-xs italic text-muted-foreground/80 mt-2 max-w-3xl">
            — Owned today by {actorName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-border bg-card px-3 py-2 text-center min-w-[88px]">
            <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              Day score
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {health.score}
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <div
              className={`text-[10px] uppercase tracking-widest font-mono ${
                health.score >= 70
                  ? "text-success"
                  : health.score >= 40
                    ? "text-warning"
                    : "text-destructive"
              }`}
            >
              {health.label}
            </div>
          </div>
        </div>
      </div>

      {shield.active ? (
        <div className="mt-4 rounded-lg bg-primary/15 border border-primary/30 px-4 py-2.5 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-primary">
            Shield Mode active
          </span>
          <span className="text-sm">{shield.label}</span>
          <span className="ml-auto text-xs text-muted-foreground">
            Until {fmtMin(shield.until ?? 0)}
          </span>
        </div>
      ) : (
        <div className="mt-4 rounded-lg bg-secondary/40 border border-border px-4 py-2.5 flex items-center gap-2 text-muted-foreground">
          <ShieldOff className="h-4 w-4" />
          <span className="font-mono text-[11px] uppercase tracking-widest">
            Shield mode off · communications open
          </span>
        </div>
      )}
    </div>
  );
}

function NowStrip({
  actorId,
  sprint,
  next,
}: {
  actorId: string;
  sprint?: ReturnType<typeof currentSprint>;
  next?: ReturnType<typeof nextSprint>;
}) {
  void actorId;
  const m = nowMin();
  if (sprint) {
    const pct = Math.round(((m - sprint.startMin) / (sprint.endMin - sprint.startMin)) * 100);
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 md:p-5">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
            Sprint {sprint.index} · live now
          </span>
          <span className="ml-auto text-xs font-mono text-muted-foreground">
            {fmtMin(sprint.startMin)} → {fmtMin(sprint.endMin)}
          </span>
        </div>
        <div className="text-base md:text-lg font-semibold">{sprint.name}</div>
        <p className="text-sm text-muted-foreground mt-1">{sprint.objective}</p>
        <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
          />
        </div>
        <div className="text-[10px] font-mono text-muted-foreground mt-1">
          {pct}% through this block
        </div>
      </div>
    );
  }
  if (next) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 md:p-5 flex items-center gap-3">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Next up
          </div>
          <div className="text-sm font-semibold">
            Sprint {next.index} · {next.name}
          </div>
        </div>
        <div className="text-xs font-mono text-primary">at {fmtMin(next.startMin)}</div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-5 text-sm text-muted-foreground flex items-center gap-2">
      <Sparkles className="h-4 w-4 text-primary" /> Day complete or off-hours. Use this time for EOD
      + tomorrow prep.
    </div>
  );
}



function SprintTimeline({
  pb,
  actorId,
  day,
  tasks,
}: {
  pb: RolePlaybook;
  actorId: string;
  day: ReturnType<typeof useConsoleDay>;
  tasks: AppTask[];
}) {
  const m = nowMin();
  return (
    <section>
      <SectionHead
        icon={Zap}
        title="Sprint plan"
        subtitle="Hour-by-hour. Tap to mark a sprint complete."
      />
      <div className="space-y-3">
        {pb.sprints.map((s: any, idx: number) => {
          const sprintId = s.id || `sprint_${s.startMin}_${idx}`;
          const done = !!day.sprints[sprintId];
          const live = m >= s.startMin && m < s.endMin;
          const past = m >= s.endMin;
          return (
            <div
              key={sprintId}
              className={`rounded-lg border p-4 transition-colors ${
                done
                  ? "border-success/40 bg-success/5"
                  : live
                    ? "border-primary/40 bg-primary/5"
                    : past
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Sprint {s.index}
                    </span>
                    <span className="font-mono text-[10px] text-primary">
                      {fmtMin(s.startMin)} → {fmtMin(s.endMin)}
                    </span>
                    {live && (
                      <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                        Live
                      </span>
                    )}
                    {past && !done && (
                      <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
                        Missed?
                      </span>
                    )}
                    {s.shielded && (
                      <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 inline-flex items-center gap-1">
                        <Shield className="h-2.5 w-2.5" />
                        Shield
                      </span>
                    )}
                  </div>
                  <div className="text-base font-semibold mt-1">{s.name || s.label}</div>
                  {s.objective && <div className="text-sm text-muted-foreground mt-0.5">{s.objective}</div>}
                </div>
                <button
                  onClick={() => toggleSprint(actorId, sprintId)}
                  className={`h-8 px-3 inline-flex items-center gap-1 rounded text-xs font-medium border ${
                    done
                      ? "border-success/40 bg-success/20 text-success"
                      : "border-border bg-secondary hover:bg-secondary/70"
                  }`}
                >
                  <Check className="h-3 w-3" /> {done ? "Done" : "Mark done"}
                </button>
              </div>
              
              {(() => {
                const sprintTasks = tasks.filter((t) => {
                  const d = new Date(t.dueAt);
                  const dueMin = d.getHours() * 60 + d.getMinutes();
                  return dueMin >= s.startMin && dueMin < s.endMin;
                });

                if (sprintTasks.length === 0) {
                  return (
                    <div className="mt-3 text-xs text-muted-foreground italic">
                      No live tasks scheduled for this sprint.
                    </div>
                  );
                }

                return (
                  <ul className="space-y-2 mt-4">
                    {sprintTasks.map((t) => {
                      const isTaskDone = t.status === "done";
                      return (
                        <li key={t.id} className={`text-sm flex items-start gap-2 p-3 rounded-md border ${isTaskDone ? "bg-success/5 border-success/30" : "bg-secondary/40 border-border"}`}>
                          <button
                            onClick={() => setStatus(t.id, isTaskDone ? "todo" : "done", actorId)}
                            className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                              isTaskDone
                                ? "bg-success text-success-foreground border-success"
                                : "border-muted-foreground/50 hover:border-primary"
                            }`}
                          >
                            {isTaskDone && <Check className="h-3 w-3" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium ${isTaskDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {t.title}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`text-[9px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded ${
                                t.priority === "urgent" ? "bg-destructive/15 text-destructive border border-destructive/30" :
                                t.priority === "high" ? "bg-warning/15 text-warning border border-warning/30" :
                                "bg-secondary border border-border text-muted-foreground"
                              }`}>
                                {t.priority}
                              </span>
                              {t.description && (
                                <span className="text-xs text-muted-foreground truncate">{t.description}</span>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}

              {s.metric && (
                <div className="mt-3 pt-2 border-t border-border/50 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                  Metric: <span className="text-foreground/80 normal-case font-sans">{s.metric}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CommWindows({
  pb,
  actorId,
  day,
}: {
  pb: RolePlaybook;
  actorId: string;
  day: ReturnType<typeof useConsoleDay>;
}) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section>
      <SectionHead
        icon={MessageSquare}
        title="Communication windows"
        subtitle={
          pb.shieldBlocks.length > 0
            ? "Send these on time. Outside these, Shield Mode applies."
            : "Send these messages on time. Tap to copy the template."
        }
      />
      <div className="space-y-2">
        {pb.commWindows.map((w: any, index: number) => {
          const sent = day.windowsSent[w.id];
          const m = nowMin();
          const overdue = !sent && m > w.atMin + 15;
          const due = !sent && m >= w.atMin - 5 && m <= w.atMin + 15;
          const isOpen = open === w.id;
          return (
            <div
              key={w.id || index}
              className={`rounded-lg border ${
                sent
                  ? "border-success/40 bg-success/5"
                  : overdue
                    ? "border-destructive/40 bg-destructive/5"
                    : due
                      ? "border-warning/40 bg-warning/5"
                      : "border-border bg-card"
              }`}
            >
              <button
                onClick={() => setOpen(isOpen ? null : w.id)}
                className="w-full p-3 flex items-center gap-3 text-left"
              >
                <div className="h-8 w-8 rounded bg-secondary flex items-center justify-center shrink-0">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{w.label}</div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    {w.channel} · scheduled {fmtMin(w.atMin)}
                  </div>
                </div>
                <div className="text-right">
                  {sent ? (
                    <span className="text-[10px] font-mono uppercase tracking-widest text-success inline-flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Sent{" "}
                      {new Date(sent).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  ) : overdue ? (
                    <span className="text-[10px] font-mono uppercase tracking-widest text-destructive inline-flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Overdue
                    </span>
                  ) : due ? (
                    <span className="text-[10px] font-mono uppercase tracking-widest text-warning">
                      Due now
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                      Pending
                    </span>
                  )}
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-border p-3 space-y-2">
                  <pre className="whitespace-pre-wrap text-xs bg-secondary/40 rounded p-3 font-sans leading-relaxed">
                    {w.template}
                  </pre>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigator.clipboard?.writeText(w.template)}
                      className="h-8 px-3 inline-flex items-center gap-1.5 rounded border border-border hover:bg-secondary text-xs"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                    <button
                      onClick={() => markWindowSent(actorId, w.id)}
                      className="h-8 px-3 inline-flex items-center gap-1.5 rounded border border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium"
                    >
                      <Send className="h-3 w-3" /> Mark sent
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CollapseRule({ pb }: { pb: RolePlaybook }) {
  return (
    <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-destructive">
          Process collapse rule
        </span>
      </div>
      <p className="text-sm leading-relaxed">{pb.collapseRule}</p>
      <div className="mt-3 pt-3 border-t border-destructive/20 text-xs italic text-muted-foreground">
        {pb.interdependence}
      </div>
    </section>
  );
}

function DecisionsLog({
  actorId,
  day,
}: {
  actorId: string;
  day: ReturnType<typeof useConsoleDay>;
}) {
  const [text, setText] = useState("");
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Gavel className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-semibold">Hard decisions today</h3>
      </div>
      <div className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g., Issued formal warning to X for second late entry."
          className="w-full text-sm bg-secondary/40 border border-border rounded p-2 min-h-[60px] resize-y"
        />
        <button
          onClick={() => {
            logDecision(actorId, text);
            setText("");
          }}
          disabled={!text.trim()}
          className="w-full h-8 inline-flex items-center justify-center gap-1.5 rounded bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
        >
          <Plus className="h-3 w-3" /> Log decision
        </button>
      </div>
      <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
        {day.decisions.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No hard decisions logged yet today. Easy decisions protect individuals; hard decisions
            protect Gharpayy.
          </p>
        ) : (
          day.decisions.map((d) => (
            <div
              key={d.id}
              className="text-xs bg-secondary/30 rounded p-2 border-l-2 border-primary"
            >
              <div className="font-mono text-[10px] text-muted-foreground">
                {new Date(d.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div>{d.text}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function EodGenerator({
  pb,
  actorId,
  day,
}: {
  pb: RolePlaybook;
  actorId: string;
  day: ReturnType<typeof useConsoleDay>;
}) {
  const [previewText, setPreviewText] = useState<string | null>(null);
  const hasFeature = useRoleFeature();

  const generateDraft = () => {
    let text = exportEodText(actorId, pb.id as PlaybookKey);
    const tasks = tasksFor(actorId);
    const todayStr = new Date().toDateString();
    const todayTasks = tasks.filter((t: any) => t.dueAt && new Date(t.dueAt).toDateString() === todayStr);
    
    if (todayTasks.length > 0) {
      const done = todayTasks.filter((t: any) => t.status === "DONE");
      const pending = todayTasks.filter((t: any) => t.status !== "DONE");
      text += `\n\nTasks Completed:\n${done.length ? done.map((t: any) => `• ${t.title}`).join("\n") : "None"}`;
      text += `\n\nTasks Pending:\n${pending.length ? pending.map((t: any) => `• ${t.title}`).join("\n") : "None"}`;
    }
    return text;
  };
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-semibold">EOD Report</h3>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {pb.eodFields.map((f: any) => (
          <div key={f.id}>
            <label className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              {f.label}
            </label>
            {f.kind === "yesno" ? (
              <div className="flex gap-1 mt-0.5">
                {(["Yes", "No"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setEod(actorId, f.id, opt)}
                    className={`flex-1 h-7 text-xs rounded border ${
                      day.eod[f.id] === opt
                        ? opt === "Yes"
                          ? "border-success/40 bg-success/15 text-success"
                          : "border-destructive/40 bg-destructive/15 text-destructive"
                        : "border-border bg-secondary"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : f.kind === "number" ? (
              <input
                type="number"
                value={day.eod[f.id] ?? ""}
                onChange={(e) => setEod(actorId, f.id, e.target.value)}
                className="w-full h-8 px-2 text-sm bg-secondary/40 border border-border rounded mt-0.5"
              />
            ) : f.kind === "text" ? (
              <input
                type="text"
                value={day.eod[f.id] ?? ""}
                onChange={(e) => setEod(actorId, f.id, e.target.value)}
                placeholder={f.placeholder}
                className="w-full h-8 px-2 text-sm bg-secondary/40 border border-border rounded mt-0.5"
              />
            ) : (
              <textarea
                value={day.eod[f.id] ?? ""}
                onChange={(e) => setEod(actorId, f.id, e.target.value)}
                placeholder={f.placeholder}
                rows={3}
                className="w-full px-2 py-1 text-sm bg-secondary/40 border border-border rounded mt-0.5 resize-y"
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t border-border">
        <button
          onClick={() => setPreviewText((v) => (v === null ? generateDraft() : null))}
          className="flex-1 h-8 inline-flex items-center justify-center gap-1.5 rounded border border-border hover:bg-secondary text-xs"
        >
          {previewText !== null ? "Hide" : "Preview"}
        </button>
        <button
          onClick={() => {
            const textToCopy = previewText !== null ? previewText : generateDraft();
            navigator.clipboard?.writeText(textToCopy);
          }}
          className="flex-1 h-8 inline-flex items-center justify-center gap-1.5 rounded bg-primary text-primary-foreground text-xs font-medium"
        >
          <Copy className="h-3 w-3" /> Copy report
        </button>
      </div>
      {previewText !== null && (
        <textarea
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          className="mt-3 w-full text-[11px] bg-secondary/40 border border-border rounded p-3 font-mono leading-relaxed min-h-[200px] resize-y"
        />
      )}
      {hasFeature("/inbox") && (
        <div className="mt-3 text-[11px] text-muted-foreground">
          <Link to="/inbox" className="text-primary hover:underline">
            View inbox
          </Link>{" "}
          to send the digest.
        </div>
      )}
    </section>
  );
}

function SectionHead({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Target;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-primary" />
      <div>
        <h2 className="font-display text-base font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}



// expose role list for debugging — referenced for tree-shake safety
export const __PLAYBOOK_KEYS__ = () => Object.keys(playbookStore.read().playbooks);
