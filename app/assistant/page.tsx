"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, ChevronRight, Loader2, Send, Sparkles, UserRound } from "lucide-react";
import type { Itinerary } from "@/lib/itinerary";
import type { TripForm } from "@/types/travel";

type Message = { id: string; role: "user" | "assistant"; text: string; suggestions?: string[]; source?: string };

const quickPrompts = [
  "Suggest places to visit",
  "Find budget-friendly hotels",
  "Recommend local food",
  "Make a 2-day itinerary",
  "What's the weather forecast?",
  "Suggest indoor activities",
  "Add adventure activities",
  "Suggest packing list",
  "Help reduce my budget",
];

export default function AssistantPage() {
  const [trip, setTrip] = useState<TripForm | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const storedTrip = localStorage.getItem("travelsetu_trip");
      const storedItinerary = localStorage.getItem("travelsetu_itinerary");
      if (storedTrip) setTrip(JSON.parse(storedTrip));
      if (storedItinerary) setItinerary(JSON.parse(storedItinerary));
    } catch {}
    setMessages([{ id: "welcome", role: "assistant", text: "Hi! I’m your TravelSetu assistant. Ask me about places, food, hotels, weather, budgets or your current itinerary.", suggestions: ["Suggest places to visit", "Recommend local food", "What should I pack?", "Help reduce my budget"], source: "welcome" }]);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const contextLabel = useMemo(() => trip?.destination || itinerary?.destination || "your trip", [trip, itinerary]);

  async function ask(question = input) {
    const message = question.trim();
    if (!message || loading) return;
    setInput("");
    const userMessage: Message = { id: `u-${Date.now()}`, role: "user", text: message };
    setMessages((current) => [...current, userMessage]);
    setLoading(true);
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, trip, itinerary }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Assistant unavailable");
      setMessages((current) => [...current, { id: `a-${Date.now()}`, role: "assistant", text: String(data.answer || "I couldn't find a good answer."), suggestions: Array.isArray(data.suggestions) ? data.suggestions : [], source: data.source }]);
    } catch {
      setMessages((current) => [...current, { id: `a-${Date.now()}`, role: "assistant", text: `I’m having trouble reaching the AI service right now. You can still use the travel tools for ${contextLabel}.`, suggestions: ["Open Trip Map", "Open Safety", "Open Itinerary"], source: "fallback" }]);
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-[#f7fafe] pb-16">
      <section className="container-page pt-10 sm:pt-14"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full bg-[#edf5ec] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#075b3d]"><Sparkles size={14} /> AI Travel Assistant</div><h1 className="mt-4 text-[40px] font-black tracking-[-0.04em] text-[#172d25] sm:text-[50px]">Your travel co-pilot.</h1><p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#63746a]">Ask questions in plain language. The assistant uses your current trip context and TravelSetu’s local demo catalog.</p></div><div className="rounded-2xl border border-[#dde7f0] bg-white px-5 py-4 shadow-sm"><div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#7b8aa0]">Current context</div><div className="mt-1 text-[18px] font-black text-[#213b30]">{contextLabel}</div></div></div></section>

      <section className="container-page mt-8 grid gap-5 lg:grid-cols-[0.82fr_1.48fr]">
        <aside className="rounded-[24px] border border-[#e0e8f0] bg-white p-5 shadow-sm"><div className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#7b8aa0]">Quick prompts</div><div className="mt-4 space-y-2">{quickPrompts.map((prompt) => <button key={prompt} onClick={() => ask(prompt)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#e3e8e0] px-4 py-3 text-left text-[12px] font-bold text-[#324961] transition hover:border-[#b8d6f7] hover:bg-[#f5f9fd]"><span>{prompt}</span><ChevronRight size={15} className="shrink-0 text-[#8da0b3]" /></button>)}</div><div className="mt-6 rounded-xl bg-[#f5f9fd] p-4"><div className="flex items-center gap-2 text-[12px] font-extrabold text-[#213b30]"><Bot size={16} className="text-[#075b3d]" /> Context-aware</div><p className="mt-2 text-[11px] leading-5 text-[#718197]">The assistant can use your saved trip and itinerary. No database is required; demo context is stored locally in your browser.</p></div></aside>

        <div className="flex min-h-[640px] flex-col overflow-hidden rounded-[24px] border border-[#e0e8f0] bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-[#e8eef4] px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf5ec] text-[#075b3d]"><Bot size={19} /></span><div><div className="text-[14px] font-black text-[#213b30]">TravelSetu Assistant</div><div className="text-[11px] text-[#7b8aa0]">Ask naturally · get practical travel help</div></div></div><div className="flex-1 space-y-4 overflow-y-auto bg-[#fbfcfe] p-5">{messages.map((message) => <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`flex max-w-[88%] gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}><span className={`mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full ${message.role === "user" ? "bg-[#172d25] text-white" : "bg-[#edf5ec] text-[#075b3d]"}`}>{message.role === "user" ? <UserRound size={15} /> : <Bot size={15} />}</span><div><div className={`rounded-2xl px-4 py-3 text-[13px] leading-6 ${message.role === "user" ? "bg-[#075b3d] text-white" : "border border-[#e3eaf1] bg-white text-[#344a61]"}`}>{message.text}</div>{message.suggestions && message.suggestions.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{message.suggestions.map((suggestion) => <button key={suggestion} onClick={() => ask(suggestion)} className="rounded-full border border-[#dce6ef] bg-white px-3 py-1.5 text-[10px] font-extrabold text-[#456078] hover:border-[#b5d1ef]">{suggestion}</button>)}</div>}</div></div></div>)}{loading && <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#edf5ec] text-[#075b3d]"><Bot size={15} /></span><div className="rounded-2xl border border-[#e3eaf1] bg-white px-4 py-3 text-[12px] font-bold text-[#63746a]"><span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Thinking about your trip…</span></div></div>}<div ref={endRef} /></div><div className="border-t border-[#e8eef4] bg-white p-4"><form onSubmit={(event) => { event.preventDefault(); ask(); }} className="flex items-center gap-2 rounded-2xl border border-[#dfe7ef] bg-[#fbfcfe] p-2"><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about your trip…" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[13px] font-semibold text-[#263d56] outline-none"/><button type="submit" disabled={loading || !input.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#075b3d] text-white disabled:opacity-40" aria-label="Send message"><Send size={17} /></button></form><div className="mt-2 text-center text-[10px] font-semibold text-[#8b99aa]">TravelSetu AI can make mistakes. For emergencies, contact official emergency services.</div></div></div>
      </section>
    </main>
  );
}
