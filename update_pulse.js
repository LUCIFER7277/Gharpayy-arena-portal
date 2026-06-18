const fs = require("fs");
const path = require("path");

const filepath = path.join(__dirname, "src", "routes", "pulse.tsx");
let content = fs.readFileSync(filepath, "utf-8");

// 1. Imports
content = content.replace('import { format, startOfWeek, endOfWeek, addDays, subWeeks, addWeeks, isSameDay, isToday } from "date-fns";', 'import { format, startOfWeek, endOfWeek, addDays, subWeeks, addWeeks, isSameDay, isToday, subDays } from "date-fns";');

// 2. State
const state_old = `  const [dateFilter, setDateFilter] = useState<string>(todayISO());
  const [weekMode, setWeekMode] = useState(false);
  const [weekAnchor, setWeekAnchor] = useState<Date>(new Date());`;
const state_new = `  const [dateRangeOption, setDateRangeOption] = useState<string>("today");
  const [customStart, setCustomStart] = useState<string>(todayISO());
  const [customEnd, setCustomEnd] = useState<string>(todayISO());`;
content = content.replace(state_old, state_new);

// 3. Date logic
const date_logic_old = `  // Week days for the selected week
  const weekDays = useMemo(() => getWeekDays(weekAnchor), [weekAnchor]);

  // Precompute which days in the week have pulse entries (for dot indicators)
  const weekDayPulseCounts = useMemo(() => {
    if (!weekMode) return new Map<string, number>();
    const allEntries = getEntries({});
    const counts = new Map<string, number>();
    for (const day of weekDays) {
      const iso = dateToISO(day);
      const count = allEntries.filter((e) => e.date === iso).length;
      counts.set(iso, count);
    }
    return counts;
  }, [weekMode, weekDays, v]);

  // Week label for display
  const weekLabel = useMemo(() => {
    const ws = weekDays[0];
    const we = weekDays[6];
    if (ws.getMonth() === we.getMonth()) {
      return \`\${format(ws, "d")} – \${format(we, "d MMM yyyy")}\`;
    }
    return \`\${format(ws, "d MMM")} – \${format(we, "d MMM yyyy")}\`;
  }, [weekDays]);

  const weekOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const anchor = subWeeks(today, i);
      const ws = startOfWeek(anchor, { weekStartsOn: 1 });
      const we = endOfWeek(anchor, { weekStartsOn: 1 });
      let label = "";
      if (i === 0) label = "This Week";
      else if (i === 1) label = "Last Week";
      else label = \`\${i} Weeks Ago\`;
      
      const dateRange = ws.getMonth() === we.getMonth() 
        ? \`\${format(ws, "d")} – \${format(we, "d MMM yyyy")}\`
        : \`\${format(ws, "d MMM")} – \${format(we, "d MMM yyyy")}\`;
        
      options.push({ label: \`\${label} (\${dateRange})\`, value: dateToISO(ws), anchor: ws });
    }
    return options;
  }, []);`;

const date_logic_new = `  const { startIso, endIso, isSingleDay } = useMemo(() => {
    const today = new Date();
    if (dateRangeOption === "today") return { startIso: todayISO(), endIso: todayISO(), isSingleDay: true };
    if (dateRangeOption === "yesterday") {
      const y = subDays(today, 1);
      return { startIso: dateToISO(y), endIso: dateToISO(y), isSingleDay: true };
    }
    if (dateRangeOption === "7days") return { startIso: dateToISO(subDays(today, 6)), endIso: todayISO(), isSingleDay: false };
    if (dateRangeOption === "14days") return { startIso: dateToISO(subDays(today, 13)), endIso: todayISO(), isSingleDay: false };
    if (dateRangeOption === "30days") return { startIso: dateToISO(subDays(today, 29)), endIso: todayISO(), isSingleDay: false };
    if (dateRangeOption === "custom") {
      return { startIso: customStart, endIso: customEnd, isSingleDay: customStart === customEnd };
    }
    return { startIso: todayISO(), endIso: todayISO(), isSingleDay: true };
  }, [dateRangeOption, customStart, customEnd]);

  const dateRangeLabel = useMemo(() => {
    if (isSingleDay) return format(new Date(startIso + "T12:00:00"), "d MMM yyyy");
    return \`\${format(new Date(startIso + "T12:00:00"), "d MMM")} – \${format(new Date(endIso + "T12:00:00"), "d MMM yyyy")}\`;
  }, [startIso, endIso, isSingleDay]);`;
content = content.replace(date_logic_old, date_logic_new);

// 4. entries
const entries_old = `  const entries = useMemo(() => {
    if (weekMode) {
      const allEntries = getEntries({});
      const weekDateSet = new Set(weekDays.map(d => dateToISO(d)));
      return allEntries.filter(e => weekDateSet.has(e.date));
    }
    return getEntries({ date: dateFilter });
  }, [v, dateFilter, weekMode, weekDays]);`;

const entries_new = `  const entries = useMemo(() => {
    const allEntries = getEntries({});
    return allEntries.filter(e => e.date >= startIso && e.date <= endIso);
  }, [v, startIso, endIso]);`;
content = content.replace(entries_old, entries_new);

// 5. groupedEntries
const groups_old = `    let result = Object.values(groups).map(empEntries => {
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
    });`;

const groups_new = `    let result = Object.values(groups).map(empEntries => {
      if (isSingleDay) {
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
      } else {
        return {
          empId: empEntries[0].employeeId,
          empName: empEntries[0].employeeName,
          role: empEntries[0].role,
          team: empEntries[0].team,
          eodEntry: undefined,
          regularEntries: empEntries
        };
      }
    });`;
content = content.replace(groups_old, groups_new);

// 6. pending logic
const pending_old = `        if (statusFilter === "pending") {
          const isTodayDate = dateFilter === todayISO();
          const currentMins = new Date().getHours() * 60 + new Date().getMinutes();
          return SLOTS.some(slot => {
            const isExpected = !isTodayDate || currentMins >= slot.startMin;`;

const pending_new = `        if (statusFilter === "pending") {
          const isTodayDate = startIso === todayISO() && isSingleDay;
          const currentMins = new Date().getHours() * 60 + new Date().getMinutes();
          return SLOTS.some(slot => {
            const isExpected = !isTodayDate || currentMins >= slot.startMin;`;
content = content.replace(pending_old, pending_new);

// 7. UI inputs
const ui_inputs_old = `              <div className="relative w-full md:w-auto">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    // Sync week anchor when date changes via picker
                    if (weekMode) setWeekAnchor(new Date(e.target.value + "T12:00:00"));
                  }}
                  className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                />
              </div>

              <button
                onClick={() => {
                  setWeekMode(!weekMode);
                  if (!weekMode) {
                    // Entering week mode: sync anchor to current dateFilter
                    setWeekAnchor(new Date(dateFilter + "T12:00:00"));
                  }
                }}
                className={\`inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-all \${
                  weekMode
                    ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
                    : "bg-card border-border text-foreground hover:bg-muted/50"
                }\`}
              >
                <Calendar className="h-4 w-4" />
                Week
              </button>`;

const ui_inputs_new = `              <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
                <Select value={dateRangeOption} onValueChange={(val) => setDateRangeOption(val)}>
                  <SelectTrigger className="w-full md:w-[200px] h-10 bg-card">
                    <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="14days">Last 14 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                
                {dateRangeOption === "custom" && (
                  <div className="flex items-center gap-2 animate-in fade-in duration-200">
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="h-10 w-full md:w-[130px] rounded-lg border border-input bg-card px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <span className="text-muted-foreground text-xs font-medium">to</span>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="h-10 w-full md:w-[130px] rounded-lg border border-input bg-card px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                )}
              </div>`;
content = content.replace(ui_inputs_old, ui_inputs_new);

// 8. weekMode panel
const week_panel_old = `            {weekMode && (
              <div className="p-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-primary/5 animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Select 
                      value={dateToISO(startOfWeek(weekAnchor, { weekStartsOn: 1 }))} 
                      onValueChange={(val) => {
                        const opt = weekOptions.find(o => o.value === val);
                        if (opt) setWeekAnchor(opt.anchor);
                      }}
                    >
                      <SelectTrigger className="w-[300px] h-9 bg-card text-sm font-semibold">
                        <SelectValue placeholder="Select Week" />
                      </SelectTrigger>
                      <SelectContent>
                        {weekOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-primary">Week Report</div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{entries.length} total pulses</div>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {weekDays.map((day) => {
                    const iso = dateToISO(day);
                    const isTodayDate = isToday(day);
                    const pulseCount = weekDayPulseCounts.get(iso) || 0;
                    const isFuture = day > new Date();
                    return (
                      <button
                        key={iso}
                        onClick={() => {
                          setDateFilter(iso);
                          setWeekMode(false);
                        }}
                        disabled={isFuture}
                        className={\`relative flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border transition-all \${
                          isTodayDate
                            ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                            : isFuture
                              ? "border-border/50 bg-muted/20 opacity-50 cursor-not-allowed"
                              : "border-border bg-card hover:bg-muted/40"
                        }\`}
                      >
                        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {format(day, "EEE")}
                        </span>
                        <span className="text-lg font-semibold tabular-nums leading-none text-foreground">
                          {format(day, "d")}
                        </span>
                        <span className="font-mono text-[9px] text-muted-foreground">
                          {format(day, "MMM")}
                        </span>
                        {pulseCount > 0 && (
                          <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-success" title={\`\${pulseCount} pulses\`} />
                        )}
                        {isTodayDate && (
                          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}`;

const week_panel_new = `            {!isSingleDay && (
              <div className="p-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-primary/5 animate-in slide-in-from-top-2 fade-in duration-200 flex items-center justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-primary">Date Range Report</div>
                  <div className="text-sm font-semibold text-foreground">{dateRangeLabel}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground font-mono">{entries.length} total pulses</div>
                </div>
              </div>
            )}`;
content = content.replace(week_panel_old, week_panel_new);

// 9. Table toggle
content = content.replace('{weekMode ? (', '{!isSingleDay ? (');
content = content.replace('for the week of {weekLabel}', 'for {dateRangeLabel}');
content = content.replace('dateFilter === todayISO()', 'startIso === todayISO() && isSingleDay');
content = content.replace('dateFilter + "T12:00:00"', 'startIso + "T12:00:00"');

fs.writeFileSync(filepath, content, "utf-8");
console.log("Done");
