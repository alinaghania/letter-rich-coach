"use client";
import { useState, useRef, useEffect } from "react";
import ChartCard, { Chart } from "@/components/ChartCard";

type Source = { title: string; url: string };
type BotMsg = { role: "bot"; text: string; charts: Chart[]; sources: Source[]; status: string; streaming: boolean };
type MeMsg = { role: "me"; text: string };
type Msg = BotMsg | MeMsg;

const SUGGESTIONS = [
  "I've got €1,000 sitting in my savings account. What now?",
  "Bitcoin — should I buy now or not?",
  "How do I invest €200/month to get rich?",
  "Is rental real estate worth it in 2026?",
];

function render(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>
  );
}

export default function Home() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState("hello");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  function patchBot(fn: (b: BotMsg) => void) {
    setMsgs((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last && last.role === "bot") { const nb = { ...last }; fn(nb); copy[copy.length - 1] = nb; }
      return copy;
    });
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const history = msgs.map((m) => ({ role: m.role === "me" ? "user" : "assistant", content: m.text }));
    setMsgs((m) => [...m, { role: "me", text: q },
      { role: "bot", text: "", charts: [], sources: [], status: "", streaming: true }]);
    setInput("");
    setLoading(true);
    setMood("wait");
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...history, { role: "user", content: q }] }),
      });
      if (!res.ok || !res.body) throw new Error("bad response");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          let evt: any;
          try { evt = JSON.parse(line.slice(5).trim()); } catch { continue; }
          if (evt.type === "text") patchBot((b) => { b.text += evt.delta; b.status = ""; });
          else if (evt.type === "status") patchBot((b) => { b.status = evt.msg; });
          else if (evt.type === "chart") patchBot((b) => { b.charts = [...b.charts, evt.chart]; });
          else if (evt.type === "sources") patchBot((b) => { b.sources = evt.sources; });
          else if (evt.type === "mood") setMood(evt.mood);
          else if (evt.type === "error") patchBot((b) => { b.text = b.text || "Ugh, my envelope glitched. Try again. 📨"; });
        }
      }
      patchBot((b) => { b.streaming = false; b.status = ""; });
    } catch {
      setMood("error");
      patchBot((b) => { b.text = "Ugh, my envelope glitched. Try again — and be more specific this time. 📨"; b.streaming = false; b.status = ""; });
    } finally {
      setLoading(false);
    }
  }

  const empty = msgs.length === 0;

  return (
    <div className="shell">
      <header className="head">
        <span className="dot" /><h1>Letter</h1><span className="live">live</span>
      </header>

      {empty ? (
        <div className={`hero ${loading ? "think" : ""}`}>
          <img src={`/letter/${loading ? "wait" : mood === "hello" ? "playful" : mood}.png`} alt="Letter" />
          <h2>Your brutally honest money coach.</h2>
          <p>Ask Letter how to get rich. Real web research, real charts, zero mercy.</p>
        </div>
      ) : (
        <div className={`minihero ${loading ? "think" : ""}`}>
          <img src={`/letter/${loading ? "wait" : mood}.png`} alt="Letter" />
        </div>
      )}

      {empty && (
        <div className="suggest">
          {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}
        </div>
      )}

      <div className="msgs">
        {msgs.map((m, i) => (
          <div key={i} className={`row ${m.role}`}>
            <div className="bubble">
              {render(m.text)}
              {m.role === "bot" && m.streaming && !m.text && m.status && (
                <span className="statuspill"><span className="spin" />{m.status}</span>
              )}
              {m.role === "bot" && m.streaming && m.text && <span className="cursor" />}
              {m.role === "bot" && m.charts.map((c, j) => <ChartCard key={j} chart={c} />)}
              {m.role === "bot" && m.sources.length > 0 && (
                <div className="sources">
                  <b>Sources</b>
                  {m.sources.map((s, j) => (
                    <a key={j} href={s.url} target="_blank" rel="noreferrer">{s.title || s.url}</a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="composer">
        <form className="inner" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <input value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Letter… e.g. I have €5,000, how do I get rich?" disabled={loading} />
          <button type="submit" disabled={loading || !input.trim()}>{loading ? "…" : "Ask"}</button>
        </form>
      </div>
    </div>
  );
}
