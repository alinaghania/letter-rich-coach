"use client";
import { useState, useRef, useEffect } from "react";
import ChartCard, { Chart } from "@/components/ChartCard";

type Source = { title: string; url: string };
type BotMsg = { role: "bot"; text: string; charts: Chart[]; sources: Source[]; mood: string };
type MeMsg = { role: "me"; text: string };
type Msg = BotMsg | MeMsg;

const SUGGESTIONS = [
  "J'ai 1000€ sur mon Livret A, j'en fais quoi ?",
  "Le Bitcoin, j'achète maintenant ou pas ?",
  "Comment investir 200€/mois pour devenir riche ?",
  "Est-ce que l'immobilier locatif vaut le coup en 2026 ?",
];

// rendu mini-markdown : **gras**
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

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const history = msgs.map((m) => ({ role: m.role === "me" ? "user" : "assistant", content: m.text }));
    setMsgs((m) => [...m, { role: "me", text: q }]);
    setInput("");
    setLoading(true);
    setMood("wait");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...history, { role: "user", content: q }] }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMood(data.mood || "playful");
      setMsgs((m) => [...m, {
        role: "bot", text: data.reply, charts: data.charts || [],
        sources: data.sources || [], mood: data.mood || "playful",
      }]);
    } catch (e) {
      setMood("error");
      setMsgs((m) => [...m, {
        role: "bot", text: "Aïe, mon enveloppe a buggé. Ré-essaie dans une seconde, et cette fois sois plus précis. 📨",
        charts: [], sources: [], mood: "error",
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shell">
      <header className="head">
        <img src="/letter/ready.png" alt="Letter" />
        <div>
          <h1>Letter 💸</h1>
          <p>Ton coach pour devenir riche. Sans pitié, mais avec les vrais chiffres.</p>
        </div>
        <span className="badge">Opus 4.8</span>
      </header>

      <div className={`stage ${loading ? "think" : ""}`}>
        <img src={`/letter/${loading ? "wait" : mood}.png`} alt="mood" />
        <div className="tag">
          {loading ? "Letter cherche les vrais chiffres…" : "Demande-lui un conseil. Prépare ton ego."}
        </div>
      </div>

      {msgs.length === 0 && (
        <div className="suggest">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)}>{s}</button>
          ))}
        </div>
      )}

      <div className="msgs">
        {msgs.map((m, i) => (
          <div key={i} className={`row ${m.role}`}>
            <div className="bubble">
              {render(m.text)}
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
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex : j'ai 5000€, comment je deviens riche ?"
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            {loading ? "…" : "Envoyer"}
          </button>
        </form>
      </div>
    </div>
  );
}
