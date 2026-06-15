import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAttendanceState } from "@/hooks/useAttendance";
import { useThreads, useMessages, sendMessage, findOrCreateThread } from "@/lib/message-store";
import { getRoster, employeeName } from "@/lib/roster";
import { tierOf } from "@/lib/permissions";
import { Avatar } from "@/components/Avatar";
import { Send, CheckCircle2, XCircle, MessageSquare, ArrowLeft, Search } from "lucide-react";

export const Route = createFileRoute("/inbox")({
  component: InboxPage,
});

function timeAgo(ts: number) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function InboxPage() {
  const { actor } = useAttendanceState();
  const threads = useThreads(actor.id);
  
  // Default active tab: first active thread or empty
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [search, setSearch] = useState("");

  const actorRoster = getRoster().find(e => e.id === actor.id);
  
  // Define if the current user is HR or Admin by casting strings
  const myRoleStr = String(actorRoster?.role || "").toUpperCase().trim();
  const myAppRoleStr = String(actorRoster?.appRole || "").toUpperCase().trim();
  const isHRorAdmin = 
    myRoleStr === "ADMIN" || myAppRoleStr === "ADMIN" || 
    myRoleStr === "HR" || myAppRoleStr === "HR" || 
    myRoleStr === "ZONE LEADER" || myRoleStr === "LEADERSHIP";
  
  const colleagues = getRoster().filter(e => {
    if (e.id === actor.id) return false;
    
    const eRoleStr = String(e.role || "").toUpperCase().trim();
    const eAppRoleStr = String(e.appRole || "").toUpperCase().trim();
    
    // Explicitly filter out pure Admin users (but keep HR even if they have admin appRole)
    if (eRoleStr !== "HR" && (eRoleStr === "ADMIN" || eAppRoleStr === "ADMIN" || eRoleStr === "SYSTEM ADMIN")) {
      return false;
    }
    
    if (!isHRorAdmin) {
      // If employee, ONLY return users whose role is HR
      return eRoleStr === "HR" || eAppRoleStr === "HR" || eRoleStr.includes("HR");
    }
    
    return true;
  });

  // Filter colleagues by search
  const filteredColleagues = colleagues.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.role && c.role.toLowerCase().includes(search.toLowerCase()))
  );

  // Sort colleagues: those with active threads first, then alphabetical
  filteredColleagues.sort((a, b) => {
    const tA = threads.find(t => t.participantIds.includes(a.id));
    const tB = threads.find(t => t.participantIds.includes(b.id));
    if (tA && tB) return tB.updatedAt - tA.updatedAt;
    if (tA) return -1;
    if (tB) return 1;
    return a.name.localeCompare(b.name);
  });

  const selectedColleague = colleagues.find(c => c.id === activeTabId);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      
      <div className={`w-full md:w-80 border-r border-border bg-card flex flex-col ${activeTabId && window.innerWidth < 768 ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border shrink-0">
          <h1 className="font-display text-xl font-semibold mb-3">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search colleagues..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 bg-secondary border-none rounded-lg pl-9 pr-3 text-sm focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">

          {/* Colleague List */}
          {filteredColleagues.map(c => {
            const thread = threads.find(t => t.participantIds.includes(c.id));
            return (
              <button
                key={c.id}
                onClick={() => setActiveTabId(c.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${activeTabId === c.id ? "bg-secondary" : "hover:bg-secondary/50"}`}
              >
                <Avatar id={c.id} size={40} />
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm truncate">{c.name}</div>
                    {thread && <div className="text-[10px] text-muted-foreground shrink-0">{timeAgo(thread.updatedAt)}</div>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {thread ? thread.lastMessage : c.role}
                  </div>
                </div>
              </button>
            );
          })}
          {filteredColleagues.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground break-words whitespace-pre-wrap text-left">
              No colleagues found.
              <br/><br/>
              Debug Roster ({getRoster().length}):
              {getRoster().map(r => `\n${r.name} - role:${r.role} appRole:${r.appRole} isHR:${r.role === "HR"}`).join("")}
            </div>
          )}
        </div>
      </div>

      {/* Right Pane (Chat View) */}
      <div className={`flex-1 flex flex-col bg-background relative ${!activeTabId ? 'hidden md:flex' : 'flex'}`}>
        {selectedColleague ? (
          <ChatView 
            actorId={actor.id} 
            colleagueId={selectedColleague.id} 
            isHRorAdmin={isHRorAdmin} 
            onBack={() => setActiveTabId("")}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <MessageSquare className="h-12 w-12 opacity-20" />
            <div className="text-sm">Select a colleague to start chatting</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Removed NotificationsView

function ChatView({ actorId, colleagueId, isHRorAdmin, onBack }: { actorId: string, colleagueId: string, isHRorAdmin: boolean, onBack: () => void }) {
  const thread = findOrCreateThread(actorId, colleagueId);
  const messages = useMessages(thread.id);
  const [text, setText] = useState("");
  
  const handleSend = (decision?: "approved" | "rejected") => {
    let msgText = text.trim();
    if (!msgText && decision) {
      msgText = decision === "approved" ? "Approved." : "Rejected.";
    }
    if (!msgText) return;

    const actionType = decision ? (decision === "approved" ? "leave_approved" : "leave_rejected") : undefined;
    sendMessage(actorId, thread.id, msgText, actionType);
    setText("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 border-b border-border bg-card/50 flex items-center px-4 shrink-0 gap-3 z-10">
        <button onClick={onBack} className="md:hidden h-8 w-8 -ml-2 rounded-full flex items-center justify-center hover:bg-secondary">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Avatar id={colleagueId} size={32} />
        <div className="font-semibold text-sm">{employeeName(colleagueId)}</div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col justify-end">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <MessageSquare className="h-10 w-10 opacity-20" />
            <div className="text-sm">Say hello to {employeeName(colleagueId)}!</div>
          </div>
        )}
        
        {messages.map(m => {
          const isMe = m.fromId === actorId;
          const isSystemAction = m.actionType === "leave_approved" || m.actionType === "leave_rejected";
          
          if (isSystemAction) {
             return (
               <div key={m.id} className="flex justify-center my-4">
                 <div className={`px-4 py-2 flex items-center gap-2 rounded-full text-xs font-medium shadow-sm border ${m.actionType === "leave_approved" ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                   {m.actionType === "leave_approved" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                   {m.body}
                 </div>
               </div>
             );
          }

          return (
            <div key={m.id} className={`flex gap-3 ${isMe ? "justify-end" : ""}`}>
              {!isMe && <Avatar id={m.fromId} size={32} className="mt-1 shrink-0" />}
              <div className={`flex flex-col gap-1 max-w-[85%] ${isMe ? "items-end" : "items-start"}`}>
                <div 
                  className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-secondary text-foreground rounded-tl-sm"}`}
                >
                  {m.body}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium px-1">
                  {new Date(m.ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-border bg-card">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input 
            type="text" 
            placeholder="Type a message or leave request..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            className="flex-1 h-12 min-w-0 bg-secondary border-none rounded-xl px-4 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
          />
          
          <div className="flex items-center justify-end gap-2 shrink-0">
            {isHRorAdmin && (
              <>
                <button 
                  onClick={() => handleSend("approved")}
                  className="h-12 px-4 bg-success/15 hover:bg-success/25 text-success rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-colors flex-1 sm:flex-none"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Approve</span>
                </button>
                <button 
                  onClick={() => handleSend("rejected")}
                  className="h-12 px-4 bg-destructive/15 hover:bg-destructive/25 text-destructive rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-colors flex-1 sm:flex-none"
                >
                  <XCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Reject</span>
                </button>
              </>
            )}
            <button 
              onClick={() => handleSend()}
              disabled={!text.trim()}
              className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              <Send className="h-5 w-5 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
