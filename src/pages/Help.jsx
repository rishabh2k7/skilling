import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Radar, Send, Sparkles } from "lucide-react";
import { Badge, Button, PageHeader, PageTransition, Reveal } from "@/components/ui";
import { useChatHistory, useSendChat } from "@/lib/api";

const SUGGESTIONS = ["Why is Docker next?", "How do I show evidence?", "What should I do this week?"];

export default function Help() {
  const [input, setInput] = useState("");
  const [optimistic, setOptimistic] = useState([]); // messages not yet confirmed by refetch
  const { data: history = [] } = useChatHistory(true);
  const sendMutation = useSendChat();
  const scrollRef = useRef(null);

  const thinking = sendMutation.isPending;
  const messages = [...history, ...optimistic];

  useEffect(() => {
    // clear optimistic entries once the server history includes them
    if (optimistic.length && history.length) {
      setOptimistic((pending) =>
        pending.filter(
          (p) =>
            !history.some(
              (h) => h.from === p.from && h.text === p.text
            )
        )
      );
    }
  }, [history, optimistic.length]);

  const submit = async (e) => {
    e.preventDefault();
    if (!input.trim() || thinking) return;
    const question = input.trim();
    setInput("");
    setOptimistic((prev) => [...prev, { from: "user", text: question }]);
    sendMutation.mutate(question, {
      onError: () => {
        setOptimistic((prev) => [
          ...prev,
          {
            from: "ai",
            text: "I could not reach the AI service. Add your API key to the .env file (see README) and restart the server.",
          },
        ]);
      },
    });
    requestAnimationFrame(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight));
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Support desk / AI assistant"
        title="A second pair of eyes for your next move."
        copy="Ask about your Skill DNA, roadmap, or how to make your evidence clearer. Answers come from the AI model configured on the server, and the conversation is saved."
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
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                Saved to the server · {messages.length} messages
              </p>
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
                    Your conversation is stored on the server.
                  </p>
                </div>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={`${m.from}-${i}-${m.text.slice(0, 12)}`}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  data-testid={`support-message-${i}`}
                  className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-line rounded-xl px-4 py-3 text-sm leading-6 ${
                      m.from === "user"
                        ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
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
