import { useState, useEffect } from "react";
import quotes from "@/lib/wu_quotes.json";
import { Sparkles } from "lucide-react";

export function DailyQuote() {
  const [quote, setQuote] = useState("");

  useEffect(() => {
    // Pick a random quote based on the current day so everyone sees the same one each day
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    
    // Filter out quotes that are actually the author's commentary
    const cleanQuotes = quotes.filter(q => 
      !q.includes("...") && 
      !q.startsWith("As if") && 
      !q.startsWith("Speaking of") &&
      !q.startsWith("In fact") &&
      !q.startsWith("What's better") &&
      !q.startsWith("Not only is Hsin") &&
      !q.startsWith("Anyone who") &&
      !q.startsWith("On our desire") &&
      !q.startsWith("On the delta")
    );
    
    const index = dayOfYear % cleanQuotes.length;
    setQuote(cleanQuotes[index]);
  }, []);

  if (!quote) return null;

  return (
    <section className="rounded-xl border border-border bg-gradient-to-br from-card to-secondary/30 p-4 md:p-5 mb-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-purple-500/50" />
      <header className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Insight of the Day · Wu Hsin
        </div>
      </header>
      <blockquote className="relative">
        <div className="text-4xl text-primary/10 absolute -top-2 -left-2 font-serif font-black">"</div>
        <p className="text-sm md:text-base font-medium leading-relaxed pl-4 pr-2 italic relative z-10 text-foreground/90">
          {quote}
        </p>
      </blockquote>
    </section>
  );
}
