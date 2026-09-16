import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Radar, Send, Sparkles } from "lucide-react";
import { Badge, Button, PageHeader, PageTransition, Reveal } from "@/components/ui";
import { useLocalState } from "@/hooks/useLocalState";

const SUGGESTIONS = ["Why is Docker next?", "How do I show evidence?", "What should I do this week?"];

/** Calls the Express backend /api/ai/chat which proxies to your chosen AI provider. */
async function askAI(question, history) {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: question, history }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  const data = await res.json();
  return data.reply;
}

export default function Help() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useLocalState("skilling-help-messages", []);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!input.trim() || thinking) return;
    const question = input.trim();
    const history = messages.slice(-8);
    setMessages([...messages, { from: "user", text: question }]);
    setInput("");
    setThinking(true);
    setError("");
    try {
      const reply = await askAI(question, history);
      setMessages((prev) => [...prev, { from: "ai", text: reply }]);
    } catch (err) {
      setError(err.message);
      setMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text: "I could not reach the AI service. Add your API key to the .env file (see README) and restart the server.",
        },
      ]);
    } finally {
      setThinking(false);
      requestAnimationFrame(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight));
    }
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Support desk / AI assistant"
        title="A second pair of eyes for your next move."
        copy="Ask about your Skill DNA, roadmap, or how to make your evidence clearer. Answers come from the AI model configured on the server."
      />

      <div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
        <Reveal className="rounded-2xl bg-[hsl(var(--primary))] p-6 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">
            <Radar size={22} />
          </div>
          <h2 className="mt-6 font-display text-2xl font-bold">Ask the signal desk</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Try “Why Docker next?” or “How do I show evidence?”
          </p>
          <div className="mt-8 space-y-2">
            {SUGGESTIONS.map((s) => (
              <motion.button
                key={s}
                whileHover={{ x: 3 }}
                onClick={() => setInput(s)}
                data-testid={`button-suggest-${s.slice(0, 5).toLowerCase()}`}
                className="block w-full rounded-lg border border-white/10 px-3 py-2.5 text-left text-xs font-semibold text-white/75 transition hover:bg-white/10"
              >
                {s}
              </motion.button>
            ))}
          </div>
        </Reveal>

        <Reveal
          delay={0.12}
          className="flex min-h-[460px] flex-col rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-card)]"
        >
          <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] pb-4">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]">
              <Sparkles size={17} />
            </div>
            <div>
              <p className="text-sm font-bold">Skilling support</p>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">AI assistant via /api/ai/chat</p>
            </div>
            <Badge tone={thinking ? "accent" : "teal"}>{thinking ? "Thinking" : "Ready"}</Badge>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-auto py-5">
            {messages.length === 0 && !thinking && (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <Bot className="mx-auto text-[hsl(var(--muted-foreground))]" size={25} />
                  <p className="mt-3 text-sm font-bold">Start with a real question.</p>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    Your conversation stays in this browser.
                  </p>
                </div>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={`${m.from}-${i}`}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  data-testid={`support-message-${i}`}
                  className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-line rounded-xl px-4 py-3 text-sm leading-6 ${
                      m.from === "user"
                        ? "bg-[hsl(var(--primary))] text-white"
                        : "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]"
                    }`}
                  >
                    {m.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {thinking && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="flex items-center gap-2 rounded-xl bg-[hsl(var(--secondary))] px-4 py-3 text-xs font-semibold text-[hsl(var(--secondary-foreground))]">
                  <span className="thinking-dots" /> Mapping your next move...
                </div>
              </motion.div>
            )}
            {error && <p className="text-xs font-bold text-[hsl(var(--destructive))]">{error}</p>}
          </div>

          <form onSubmit={submit} className="flex gap-2 border-t border-[hsl(var(--border))] pt-4">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              data-testid="input-support-question"
              className="min-w-0 flex-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--secondary-foreground))]"
              placeholder="Ask about your next move..."
            />
            <Button type="submit" testId="button-ask-support" className="px-3">
              <Send size={16} />
            </Button>
          </form>
        </Reveal>
      </div>
    </PageTransition>
  );
}
