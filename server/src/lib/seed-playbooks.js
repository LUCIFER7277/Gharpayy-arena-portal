/**
 * seed-playbooks.js — Seed all role playbooks into MongoDB.
 *
 * Playbook IDs use the role-slug format:
 *   actor.role.toLowerCase().replace(/\s+/g, "_")
 *
 * This matches the resolution logic in:
 *   - src/routes/console.tsx  (ConsolePage: playbookKey)
 *   - src/lib/console-store.ts (shieldNow / currentSprint / etc.)
 *   - src/components/AppShell.tsx (hasPlaybook)
 */

import { Playbook } from "../models/index.js";

const t = (h, m = 0) => h * 60 + m;

// ─── COMMUNICATION SHIELD (Floor Lead / Nithya) ──────────────────────────────
const COMMUNICATION_SHIELD = {
  id: "communication_shield",
  title: "Communication Shield",
  subtitle: "In-Office Command · Precision Communication",
  oneLiner:
    "You run the in-office engine and control Gharpayy's entire communication rhythm. Every hour counts, every message lands.",
  interdependence:
    "If this role fails → office discipline collapses → Sneha has no floor data → Jiya's trainees enter chaos.",
  collapseRule:
    "If in-office call volume < 50% of daily target by 1:00 PM, OR any employee unreachable for 2+ hours → alert the Performance Enforcer at the 1:00 PM window.",
  shieldBlocks: [
    { startMin: t(10, 40), endMin: t(13, 0), label: "Sprint Block · No group msgs" },
    { startMin: t(14, 0), endMin: t(17, 0), label: "Sprint Block · No group msgs" },
  ],
  kpis: [
    { id: "ontime", label: "On-time at desk by 10:30", target: 100, unit: "%", kind: "percent", why: "A late start is a lost morning sprint." },
    { id: "conn", label: "Avg connections / person", target: 70, kind: "count", why: "Below 70, the funnel collapses by EOD." },
    { id: "ghost", label: "Ghost leads cleared", target: 1, kind: "boolean", why: "Zero leads without a next-step task." },
    { id: "stuck", label: "Stuck WhatsApp chats >24h", target: 0, kind: "count", why: "Silence kills trust. Move every chat." },
    { id: "revived", label: "Revived leads (7-day sweep)", target: 20, kind: "count", why: "Yesterday's silence is today's revenue." },
    { id: "audited", label: "Lead journeys audited", target: 30, kind: "count", why: "Movement, not chatting. Tour-bound or out." },
    { id: "corrections", label: "Real-time corrections", target: 5, kind: "count", why: "Fix the pitch on the call, not at debrief." },
    { id: "windows", label: "Comm windows sent on time", target: 4, kind: "count", why: "4 windows. Not 5. Not 3. Exactly 4." },
    { id: "scored", label: "Every employee scored A/B/C", target: 1, kind: "boolean", why: "Public scoreboard or no scoreboard." },
    { id: "c_player_1on1", label: "C-player 1:1s done by 7 PM", target: 1, kind: "boolean", why: "C-players don't go home without a plan." },
  ],
  sprints: [
    {
      id: "n_s1", index: 1, name: "Floor Ignition + CRM Audit",
      startMin: t(10, 30), endMin: t(12, 0),
      objective: "Start sharp. Every target spoken. CRM clean before Sprint 2.",
      actions: [
        { time: "10:25", do: "Setup attendance, perf tracker, CRM open", output: "Systems ready" },
        { time: "10:30", do: "Stand-up — every person states their target out loud", output: "Targets spoken" },
        { time: "10:40", do: "Lock attendance. Shield Mode begins", output: "Group msg sent at 10:40" },
        { time: "10:45–11:30", do: "CRM Audit Round 1 — assign next-step task to every ghost lead", output: "Zero ghost leads" },
        { time: "11:30–12:00", do: "Floor monitoring — catch 3 early blockers", output: "3 blockers resolved" },
      ],
      metric: "100% CRM task alignment. 70+ acknowledged. Ghost leads cleared.",
    },
    {
      id: "n_s2", index: 2, name: "WhatsApp + 7-Day Lead Sweep",
      startMin: t(12, 0), endMin: t(13, 0),
      objective: "No chat stuck >7 days. 20 leads revived.",
      actions: [
        { time: "12:00–12:30", do: "Sweep WhatsApp — every chat older than 24h gets a move", output: "Backlog cleared" },
        { time: "12:30–1:00", do: "7-day sweep — revive 20 leads with new pitch", output: "20 revived" },
      ],
      metric: "Zero chats stuck >7 days. 20 leads revived.",
    },
    {
      id: "n_s3", index: 3, name: "Lead Journey Audit + Real-Time Corrections",
      startMin: t(14, 30), endMin: t(16, 0),
      objective: "Leads must be moving toward a tour, not in circles.",
      shielded: true,
      actions: [
        { time: "2:30–3:30", do: "Audit 30 lead journeys — flag the ones going in circles", output: "30 journeys verified" },
        { time: "3:30–4:00", do: "5 real-time corrections — intervene on the live call", output: "5 corrections done" },
      ],
      metric: "30 journeys verified. 5 real-time corrections.",
    },
    {
      id: "n_s4", index: 4, name: "70-Connection Enforcement",
      startMin: t(16, 0), endMin: t(17, 0),
      objective: "No one ends below 70. Lagging employees get a protected sprint.",
      actions: [
        { time: "4:00–4:30", do: "Audit who's below 50 — give them a 30-min uninterrupted block", output: "Lagging in protected sprint" },
        { time: "4:30–5:00", do: "Push the floor — public count visible", output: "Count visible to all" },
      ],
      metric: "Every person on track for 70+ by 7 PM.",
    },
    {
      id: "n_s5", index: 5, name: "Final Push + Scorecards",
      startMin: t(17, 20), endMin: t(19, 30),
      objective: "Public scoreboard. C-player 1:1 before 7 PM.",
      actions: [
        { time: "5:20–6:30", do: "Post scoreboard. C-player 1:1 mandatory", output: "Scoreboard posted, 1:1 done" },
        { time: "6:30–7:30", do: "Action plans signed. EOD prep", output: "Plans signed" },
      ],
      metric: "All scored. All C-players have a written plan for tomorrow.",
    },
  ],
  commWindows: [
    {
      id: "n_w1", label: "Morning Ignition", atMin: t(10, 30), channel: "WhatsApp Group",
      template: "🌅 Good morning, Gharpayy!\nToday's targets:\n📞 Connections per person: 70+\n🏠 Tours to support: 10\n💬 WhatsApp chats actioned: All of them\n⏰ Everyone at desk. Targets spoken. Let's start.\nNext update: 1:00 PM. 💪",
    },
    {
      id: "n_w2", label: "Mid-Day Pulse", atMin: t(13, 0), channel: "WhatsApp Group",
      template: "📊 1 PM — Numbers before break:\nConnections avg: {{avg}}\nTours booked: {{tours}}\nChats stuck >24h: {{stuck}} — must be zero by 5 PM\nOn track: {{on_track}}\nNeeds push: {{needs_push}}\nBreak: 1:15–2:00. Back at 2:00 sharp. 🍽️",
    },
    {
      id: "n_w3", label: "Pre-Snack Push", atMin: t(17, 0), channel: "WhatsApp Group",
      template: "🔥 5 PM check-in:\nConnections avg: {{avg}} (need 70+)\nTours today: {{tours}}/10\nRevived leads: {{revived}}/20\nStrong finish: {{strong}}\nFinal sprint needed: {{final}}\nSnack: 5:00–5:20. 5:20 — final push. No drift. 💪",
    },
    {
      id: "n_w4", label: "EOD Report", atMin: t(19, 30), channel: "WhatsApp Group",
      template: "🌙 EOD — {{date}}\nConnections avg: {{avg}}/70\nTours done: {{tours}}/10\nStuck chats: {{stuck}}\nRevived: {{revived}}/20\nA: {{a}} | B: {{b}} | C: {{c}}\nHard decision today: {{hard}}",
    },
  ],
  eodFields: [
    { id: "avg_conn", label: "Avg connections / person", kind: "number" },
    { id: "tours", label: "Tours from floor", kind: "number" },
    { id: "stuck", label: "Stuck chats remaining", kind: "number" },
    { id: "revived", label: "Leads revived", kind: "number" },
    { id: "a", label: "A players (names)", kind: "list" },
    { id: "b", label: "B players (names)", kind: "list" },
    { id: "c", label: "C players (names)", kind: "list" },
    { id: "ghost_clean", label: "CRM clean — zero ghost leads?", kind: "yesno" },
    { id: "windows_on_time", label: "All 4 windows sent on time?", kind: "yesno" },
    { id: "hard", label: "The hard decision today", kind: "text", placeholder: "e.g., Formal warning to X for second late entry." },
    { id: "flag", label: "Flag for leadership", kind: "text" },
  ],
};

// ─── PERFORMANCE ENFORCER (TCM Lead / Sneha) ──────────────────────────────────
const PERFORMANCE_ENFORCER = {
  id: "performance_enforcer",
  title: "Performance Enforcer",
  subtitle: "Tours + Closings Command · The 10:16:60 Standard",
  oneLiner:
    "Ensure the revenue engine never stops. 10 tours/day. 60% show-up. 2 closings/TCM after 6 tours.",
  interdependence:
    "If this role fails → tours don't happen → closings don't happen → Gharpayy makes no money.",
  collapseRule:
    "If tours < 10 by 5:00 PM, OR show-up % < 60 weekly → alert the Floor Lead and leadership at the 5:00 PM window.",
  shieldBlocks: [],
  kpis: [
    { id: "booked", label: "Tours booked", target: 16, kind: "count", why: "16 to guarantee 10 done at 60% show-up." },
    { id: "done", label: "Tours completed", target: 10, kind: "count", why: "10 is the floor. Below 10 = no revenue day." },
    { id: "showup", label: "Show-up % this week", target: 60, unit: "%", kind: "percent", why: "Below 60% = pitch or confirmation broken." },
    { id: "closings", label: "TCM closings (after 6 tours)", target: 2, kind: "count", why: "6 tours and no close = the ask was missed." },
    { id: "noshows", label: "No-shows analyzed", target: 100, unit: "%", kind: "percent", why: "Every no-show has a named reason. No exceptions." },
    { id: "pitch_fix", label: "Pitch corrections sent", target: 5, kind: "count", why: "Specific quote → specific fix → next call." },
    { id: "tomorrow", label: "Tomorrow's morning tours confirmed", target: 100, unit: "%", kind: "percent", why: "Confirmed today, or it's already broken." },
    { id: "ooo", label: "OOO team connected", target: 100, unit: "%", kind: "percent", why: "Silence in the morning = drift all day." },
    { id: "calls_listened", label: "Live calls listened-in", target: 8, kind: "count", why: "Coach in the moment, not at debrief." },
    { id: "red_zone_named", label: "Red-zone names published", target: 1, kind: "boolean", why: "If the floor doesn't see it, it isn't real." },
    { id: "tcm_six_rule", label: "TCMs hitting 6-tour rule", target: 100, unit: "%", kind: "percent", why: "Below 6 = the ask was never made." },
    { id: "evening_ranking", label: "Evening ranking posted", target: 1, kind: "boolean", why: "Public leaderboard at 6 PM. No exceptions." },
  ],
  sprints: [
    {
      id: "s_s1", index: 1, name: "Show-Up Drill + OOO Connect",
      startMin: t(10, 30), endMin: t(12, 0),
      objective: "Start the day knowing where yesterday broke and whether today can deliver 10 tours.",
      actions: [
        { time: "10:25", do: "Open Callyzer, Superfone, OOO group", output: "Systems live" },
        { time: "10:30–10:45", do: "OOO connect — 2-min check per person", output: "Everyone confirmed" },
        { time: "10:45–11:30", do: "Audit yesterday's show-up data — name root cause", output: "No-show analysis done" },
        { time: "11:30–12:00", do: "Correction calls to Flow Ops below 60%", output: "Specific fixes given" },
      ],
      metric: "60%+ show-up enforced. Zero un-analyzed no-shows. 100% OOO connected.",
    },
    {
      id: "s_s2", index: 2, name: "TCM Closing Audit",
      startMin: t(12, 0), endMin: t(13, 15),
      objective: "Did 6-tour-to-2-closing rule hit? If not, find the exact missed ask.",
      actions: [
        { time: "12:00–12:30", do: "Pull call logs — verify 6 tours per TCM + ask made", output: "Logs reviewed" },
        { time: "12:30–1:15", do: "Listen to recordings of misses — name the moment", output: "Gap documented w/ timestamp" },
      ],
      metric: "2 closings tracked per TCM. Every miss has a named reason.",
    },
    {
      id: "s_s3", index: 3, name: "Performance Correction + Floor Lead Sync",
      startMin: t(14, 30), endMin: t(16, 0),
      objective: "Intervene before the day runs out.",
      actions: [
        { time: "2:30–3:00", do: "Sync with Floor Lead — leads enough? comms blocking?", output: "Joint action agreed" },
        { time: "3:00–4:00", do: "Live correction — listen + intervene on 5 Flow Ops", output: "5 interventions done" },
      ],
      metric: "5 interventions. Floor Lead synced.",
    },
    {
      id: "s_s4", index: 4, name: "Tomorrow's Tour Guarantee",
      startMin: t(16, 0), endMin: t(17, 0),
      objective: "Every morning tour reconfirmed today.",
      actions: [
        { time: "4:00–4:45", do: "Call/WhatsApp every 10am-1pm tomorrow lead", output: "100% confirmed" },
        { time: "4:45–5:00", do: "Verify 16 bookings/Flow Op for tomorrow", output: "Gaps filled now" },
      ],
      metric: "Tomorrow's morning tours: 100% confirmed.",
    },
    {
      id: "s_s5", index: 5, name: "Evening OOO + Final Numbers",
      startMin: t(17, 20), endMin: t(19, 30),
      objective: "Public ranking. Final count visible to all.",
      actions: [
        { time: "5:20–6:00", do: "Pulse check — red zone updated", output: "Red zone shared" },
        { time: "6:00–7:00", do: "Evening OOO meeting — public ranking", output: "Numbers visible" },
        { time: "7:00–7:30", do: "Performance gap report → EOD", output: "Numbers ready" },
      ],
      metric: "Final ranking shared. Gap report ready.",
    },
  ],
  commWindows: [
    {
      id: "s_w1", label: "Morning OOO Connect (1:1)", atMin: t(10, 30), channel: "WhatsApp 1:1",
      template: "Hey {{name}} 👋 Quick 2-min check.\nWhat's your tour target today? Leads assigned? Any blockers? Reply now.",
    },
    {
      id: "s_w2", label: "Morning Group Start", atMin: t(10, 45), channel: "WhatsApp Group",
      template: "✅ Morning team! Everyone connected.\n🏠 Tours to book: 16 (to guarantee 10 done)\n📍 Show-ups yesterday: {{yest_showup}}\n💰 Closings expected: 2 per TCM (after 6 tours)\nThe number that matters: 10. Let's go. 🔑",
    },
    {
      id: "s_w3", label: "Specific Feedback (1:1)", atMin: t(15, 0), channel: "WhatsApp 1:1",
      template: "Hey {{name}}, reviewed your {{time}} call.\nWhen the customer said \"{{quote}}\", you responded with \"{{response}}\" — that's where they went cold.\nNext time say: \"{{better}}\".\nTry this in your next 3 calls. Tell me how it goes.",
    },
    {
      id: "s_w4", label: "Evening Group Update", atMin: t(18, 0), channel: "WhatsApp Group",
      template: "🌇 Evening update:\nTours completed: {{done}}/10\nShow-up this week: {{showup}}%\n🏆 Top performer: {{top}}\n⚠️ Red zone: {{red}}\nTomorrow's morning tours: {{tomorrow}} confirmed\nOne fix for tomorrow: {{fix}}",
    },
  ],
  eodFields: [
    { id: "ooo_connected", label: "OOO connected (X/total)", kind: "text" },
    { id: "booked", label: "Tours booked today", kind: "number" },
    { id: "done", label: "Tours completed", kind: "number" },
    { id: "showup", label: "Show-up % this week", kind: "number" },
    { id: "closings", label: "TCM closings today", kind: "number" },
    { id: "six_rule", label: "6-tour rule met?", kind: "yesno" },
    { id: "no_shows_root", label: "No-show root causes", kind: "list" },
    { id: "fixes_sent", label: "Pitch corrections sent", kind: "number" },
    { id: "tomorrow_confirmed", label: "Tomorrow morning tours confirmed (X/X)", kind: "text" },
    { id: "hard", label: "The hard decision today", kind: "text", placeholder: "e.g., Final warning — 40% show-up 3 days." },
    { id: "flag", label: "Flag for leadership", kind: "text" },
  ],
};

// ─── OPERATOR DAY (general Operator role) ────────────────────────────────────
const OPERATOR_DAY = {
  id: "operator",
  title: "Operator Day",
  subtitle: "Field Execution · Lead-to-Tour Pipeline",
  oneLiner:
    "Execute the day's lead pipeline with precision. Hit 70 connections, move every chat, and close every tour you can.",
  interdependence:
    "Your activity directly fills the tour calendar. If you slow down, the whole conversion engine stalls.",
  collapseRule:
    "If connections < 40 by 1:00 PM → flag to Floor Lead immediately and request support.",
  shieldBlocks: [
    { startMin: t(10, 40), endMin: t(13, 0), label: "Deep Work Block · No personal calls" },
    { startMin: t(14, 0), endMin: t(17, 0), label: "Deep Work Block · Calls only" },
  ],
  kpis: [
    { id: "conn", label: "Connections made", target: 70, kind: "count", why: "70 is the floor. Below = below quota." },
    { id: "chats", label: "Chats actioned", target: 30, kind: "count", why: "Every chat needs a next step." },
    { id: "tours", label: "Tours booked", target: 3, kind: "count", why: "3 tours/day keeps the pipeline alive." },
    { id: "followups", label: "Follow-ups sent", target: 20, kind: "count", why: "Silence = lost lead." },
    { id: "ontime", label: "At desk by 10:30", target: 1, kind: "boolean", why: "First 30 minutes set the tone." },
  ],
  sprints: [
    {
      id: "op_s1", index: 1, name: "Morning Ignition",
      startMin: t(10, 30), endMin: t(13, 0),
      objective: "Hit 40+ connections before break. CRM clean.",
      actions: [
        { time: "10:30", do: "State target aloud at stand-up", output: "Committed publicly" },
        { time: "10:40–1:00", do: "Call sprint — 40+ connections", output: "40 connections reached" },
      ],
      metric: "40+ connections. Zero ghost leads.",
    },
    {
      id: "op_s2", index: 2, name: "Chat Sweep",
      startMin: t(13, 0), endMin: t(14, 0),
      objective: "Clear all stuck WhatsApp chats before afternoon sprint.",
      actions: [
        { time: "1:00–1:45", do: "WhatsApp sweep — move every chat older than 24h", output: "Backlog cleared" },
      ],
      metric: "Zero chats stuck >24h.",
    },
    {
      id: "op_s3", index: 3, name: "Afternoon Call Push",
      startMin: t(14, 0), endMin: t(17, 0),
      objective: "Remaining 30 connections. Book 3 tours.",
      actions: [
        { time: "2:00–4:30", do: "Call sprint — remaining connections + tour bookings", output: "70 total. 3 tours." },
        { time: "4:30–5:00", do: "Follow-up sends for today's fresh leads", output: "20 follow-ups sent" },
      ],
      metric: "70 connections. 3 tours booked. 20 follow-ups sent.",
    },
    {
      id: "op_s4", index: 4, name: "EOD Wrap",
      startMin: t(17, 20), endMin: t(19, 30),
      objective: "Log results. Flag anything that needs tomorrow.",
      actions: [
        { time: "5:20–6:00", do: "Update CRM with today's outcomes", output: "CRM updated" },
        { time: "6:00–7:30", do: "EOD report + tomorrow priority list", output: "EOD submitted" },
      ],
      metric: "EOD submitted. Tomorrow's top 5 leads flagged.",
    },
  ],
  commWindows: [
    {
      id: "op_w1", label: "Morning Update", atMin: t(10, 45), channel: "WhatsApp Group",
      template: "🟢 {{name}} at desk.\nTarget today: {{conn}} connections, {{tours}} tours.\nTop lead to close: {{lead}}",
    },
    {
      id: "op_w2", label: "1 PM Check-in", atMin: t(13, 0), channel: "WhatsApp Group",
      template: "📊 1 PM:\nConnections: {{conn}}/70\nTours booked: {{tours}}/3\nBlocker (if any): {{blocker}}",
    },
    {
      id: "op_w3", label: "EOD Report", atMin: t(19, 30), channel: "WhatsApp Group",
      template: "🌙 EOD — {{date}}\nConnections: {{conn}}/70\nTours booked: {{tours}}/3\nFollowups sent: {{followups}}/20\nHard decision: {{hard}}",
    },
  ],
  eodFields: [
    { id: "conn", label: "Connections made", kind: "number" },
    { id: "tours", label: "Tours booked", kind: "number" },
    { id: "chats", label: "Chats actioned", kind: "number" },
    { id: "followups", label: "Follow-ups sent", kind: "number" },
    { id: "blocker", label: "Today's main blocker", kind: "text", placeholder: "e.g., Bad leads, no response after 5 PM." },
    { id: "hard", label: "Hard decision or flag", kind: "text" },
  ],
};

// ─── FLOOR LEAD ───────────────────────────────────────────────────────────────
// Alias to Communication Shield but keyed for "Floor Lead" role
const FLOOR_LEAD = {
  ...COMMUNICATION_SHIELD,
  id: "floor_lead",
};

// ─── ALL PLAYBOOKS ────────────────────────────────────────────────────────────
export const PLAYBOOKS_TO_SEED = [
  COMMUNICATION_SHIELD,
  FLOOR_LEAD,
  PERFORMANCE_ENFORCER,
  OPERATOR_DAY,
  // Add additional role-specific playbooks here as needed
  // Each `id` must match: role.toLowerCase().replace(/\s+/g, "_")
];

/**
 * Idempotent: upserts all playbooks into DB.
 * Only creates if not present; updates if content has changed.
 */
export async function seedPlaybooks() {
  const results = [];
  for (const pb of PLAYBOOKS_TO_SEED) {
    const r = await Playbook.updateOne(
      { id: pb.id },
      { $set: pb },
      { upsert: true }
    );
    results.push({
      id: pb.id,
      inserted: r.upsertedCount > 0,
      updated: r.modifiedCount > 0,
    });
  }
  console.log("[seedPlaybooks] seeded", results.length, "playbooks");
  return results;
}
