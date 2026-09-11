import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type CSSProperties, type ReactElement } from "react";
import { trpc } from "../lib/trpc";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

// One example tile in the gallery. We don't have real screenshots yet, so each
// example is a lightweight SVG mock of a widget the app produces — enough to
// communicate the "visual thinking framework" promise.
interface Example {
  tag: string;
  title: string;
  blurb: string;
  render: () => ReactElement;
}

const ACCENT = "var(--vizithink-accent)";
const ACCENT2 = "var(--vizithink-accent-2)";

const EXAMPLES: Example[] = [
  {
    tag: "/2x2",
    title: "2×2 Matrix",
    blurb: "Plot options against two axes to see the trade-offs at a glance.",
    render: TwoByTwoMock,
  },
  {
    tag: "/sc",
    title: "Scenario Flow",
    blurb: "Branch the futures, weigh their odds, and watch the paths fan out.",
    render: SankeyMock,
  },
  {
    tag: "/eis",
    title: "Eisenhower",
    blurb: "Sort by urgent vs. important so you act on what matters.",
    render: EisenhowerMock,
  },
  {
    tag: "/factors",
    title: "Factor Spectrums",
    blurb: "Slide each factor toward the pole that fits you — see where you lean.",
    render: FactorsMock,
  },
  {
    tag: "/pc",
    title: "Pros & Cons",
    blurb: "Weigh each factor for and against — no slog, just the signal.",
    render: ProConMock,
  },
  {
    tag: "/dt",
    title: "Decision Tree",
    blurb: "Map choices into branches and follow the strongest path.",
    render: TreeMock,
  },
];

// Clickable starter questions. Each opens /chat?q=… which auto-asks the
// question (shows it as the user's message) and lets the router answer.
const EXAMPLE_PROMPTS = [
  "Help me compare New York and Tokyo, London, Paris for cost of living vs. access to a good tech scene",
  "What outcomes should I prepare for if I quit to go freelance?",
  "What are the factors to consider when working at a startup vs a big bank?",
];

const TESTIMONIALS = [
  {
    quote:
      "I used to drown in twelve-tab research spirals. ViziThink got me to a decision in one afternoon.",
    name: "Maya R.",
    role: "Founder, seed-stage SaaS",
    tint: "var(--vizithink-concept)",
  },
  {
    quote:
      "The 2×2 is deceptively simple. Seeing the options laid out killed three weeks of going in circles.",
    name: "Daniel K.",
    role: "Product lead",
    tint: "var(--vizithink-framework)",
  },
  {
    quote:
      "It’s the first AI tool that made me think more clearly instead of just handing me a wall of text.",
    name: "Priya S.",
    role: "Engineering manager",
    tint: "var(--vizithink-merged)",
  },
];

function LandingPage() {
  return (
    <div className="vt-aurora" style={{ overflowY: "auto", height: "100%" }}>
      <Hero />
      <ExamplePrompts />
      <Manifesto />
      <Gallery />
      <Testimonials />
      <Waitlist />
      <footer
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "36px 24px 52px",
          color: "var(--vizithink-text-subtle)",
          fontSize: 13,
          borderTop: "1px solid var(--vizithink-border-soft)",
        }}
      >
        <img src="/logo-mark.svg" alt="" width={20} height={20} style={{ opacity: 0.8 }} />
        ViziThink.com · AI Decision Buddy
      </footer>
    </div>
  );
}

function Hero() {
  return (
    <section
      style={{
        maxWidth: 880,
        margin: "0 auto",
        padding: "76px 24px 56px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.01em",
          color: "var(--vizithink-accent)",
          background: "rgba(110, 168, 254, 0.1)",
          border: "1px solid rgba(110, 168, 254, 0.3)",
          padding: "6px 14px 6px 8px",
          borderRadius: 999,
          marginBottom: 28,
        }}
      >
        <img src="/logo-mark.svg" alt="" width={22} height={22} />
        ViziThink.com
      </div>
      <h1
        className="vizithink-display"
        style={{
          fontSize: "clamp(42px, 7vw, 62px)",
          lineHeight: 1.04,
          margin: 0,
          letterSpacing: "-0.02em",
          fontWeight: 500,
        }}
      >
        Your AI{" "}
        <span className="vt-grad-text" style={{ fontWeight: 600 }}>
          Decision&nbsp;Buddy
        </span>
      </h1>
      <p
        style={{
          color: "var(--vizithink-text-muted)",
          marginTop: 20,
          fontSize: 19,
          lineHeight: 1.55,
          maxWidth: 560,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        Make complex decisions with visual thinking frameworks. ViziThink helps
        you see the road ahead and decide with clarity.
      </p>
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          marginTop: 34,
          flexWrap: "wrap",
        }}
      >
        <Link to="/chat" className="vt-cta" style={primaryBtn}>
          Make a decision →
        </Link>
        <a href="#waitlist" style={secondaryBtn}>
          Follow updates
        </a>
      </div>

      <HeroVisual />
    </section>
  );
}

// The hero's centerpiece: a faux app window showing a scenario flow fanning out
// from one decision — the product's flagship picture, floating gently.
function HeroVisual() {
  return (
    <div className="vt-float" style={{ maxWidth: 680, margin: "56px auto 0", position: "relative" }}>
      <div
        style={{
          borderRadius: 16,
          background: "linear-gradient(180deg, var(--vizithink-surface) 0%, var(--vizithink-surface-2) 100%)",
          border: "1px solid var(--vizithink-border)",
          boxShadow: "0 30px 80px rgba(0, 0, 0, 0.55), 0 0 60px rgba(110, 168, 254, 0.07)",
          overflow: "hidden",
          textAlign: "left",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderBottom: "1px solid var(--vizithink-border-soft)",
          }}
        >
          <span style={windowDot("#ff8b8b")} />
          <span style={windowDot("#f0b86e")} />
          <span style={windowDot("#5fd6a6")} />
          <span
            style={{
              marginLeft: 10,
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--vizithink-text-muted)",
            }}
          >
            🔭 Should I quit to go freelance?
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--vizithink-accent)",
            }}
          >
            scenario flow
          </span>
        </div>
        <HeroSankey />
      </div>
    </div>
  );
}

// Hand-laid Sankey: one decision node on the left fans into three futures, the
// middle future branches again. Band thickness ~ likelihood; colour = outcome.
function HeroSankey() {
  const good = "#5fd6a6";
  const bad = "#ff8b8b";
  const neutral = "#6e7588";
  const band = (d: string, w: number, color: string, id: string) => (
    <g key={id}>
      <path d={d} fill="none" stroke={`url(#${id})`} strokeWidth={w} strokeOpacity={0.5} />
    </g>
  );
  const grad = (id: string, to: string) => (
    <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#6ea8fe" stopOpacity={0.9} />
      <stop offset="100%" stopColor={to} />
    </linearGradient>
  );
  const grad2 = (id: string, from: string, to: string) => (
    <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor={from} stopOpacity={0.8} />
      <stop offset="100%" stopColor={to} />
    </linearGradient>
  );
  const label = (x: number, y: number, text: string, pct: string, color: string) => (
    <g key={text}>
      <text x={x} y={y} fontSize={11.5} fontWeight={600} fill="var(--vizithink-text)">
        {text}
      </text>
      <text x={x} y={y + 14} fontSize={10.5} fill={color}>
        {pct}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 660 250" style={{ display: "block", width: "100%" }} aria-hidden>
      <defs>
        {grad("hs-a", good)}
        {grad("hs-b", neutral)}
        {grad("hs-c", bad)}
        {grad2("hs-d", neutral, good)}
        {grad2("hs-e", neutral, bad)}
      </defs>
      {/* flows from the decision */}
      {band("M64,118 C190,118 190,52 320,52", 34, good, "hs-a")}
      {band("M64,148 C190,148 190,128 320,128", 26, neutral, "hs-b")}
      {band("M64,176 C190,176 190,198 320,198", 18, bad, "hs-c")}
      {/* second-level branches off the middle future */}
      {band("M332,122 C420,122 430,96 520,96", 14, good, "hs-d")}
      {band("M332,136 C420,136 430,162 520,162", 11, bad, "hs-e")}

      {/* nodes */}
      <rect x="52" y="100" width="12" height="92" rx="3" fill="#6ea8fe" />
      <rect x="320" y="35" width="12" height="34" rx="3" fill={good} />
      <rect x="320" y="115" width="12" height="26" rx="3" fill={neutral} />
      <rect x="320" y="189" width="12" height="18" rx="3" fill={bad} />
      <rect x="520" y="89" width="12" height="14" rx="3" fill={good} />
      <rect x="520" y="156" width="12" height="11" rx="3" fill={bad} />

      {/* labels */}
      <text x="50" y="86" fontSize={12} fontWeight={700} fill="var(--vizithink-text)">
        Quit &amp; go freelance
      </text>
      {label(340, 48, "Clients in 3 months", "55% · good", good)}
      {label(340, 124, "Slow first year", "30% · ok", neutral)}
      {label(340, 198, "Back to job hunt", "15% · bad", bad)}
      {label(540, 96, "Raise rates", "60%", good)}
      {label(540, 163, "Burn savings", "40%", bad)}
    </svg>
  );
}

function ExamplePrompts() {
  // A little colour variety per bubble, drawn from the theme tokens.
  const colors = [
    "var(--vizithink-concept)",
    "var(--vizithink-framework)",
    "var(--vizithink-merged)",
  ];
  return (
    <section style={{ maxWidth: 720, margin: "0 auto", padding: "8px 24px 56px" }}>
      <SectionHeading
        kicker="Try it"
        title="Ask anything"
        subtitle="Tap a question to open the chat — ViziThink asks it for you, then answers and surfaces the right framework."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 32 }}>
        {EXAMPLE_PROMPTS.map((q, i) => {
          const color = colors[i % colors.length];
          return (
            <Link
              key={q}
              to="/chat"
              search={{ q }}
              className="vizithink-bubble"
              style={{ ...bubble, borderColor: color }}
              aria-label={`Ask: ${q}`}
            >
              <span style={{ display: "block", paddingRight: 40 }}>{q}</span>
              <span style={{ ...bubbleArrow, background: color }} aria-hidden>
                →
              </span>
              <span style={{ ...bubbleTail, borderColor: color }} aria-hidden />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function Manifesto() {
  return (
    <section
      style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "16px 24px 56px",
      }}
    >
      <div
        style={{
          position: "relative",
          background: "var(--vizithink-surface)",
          border: "1px solid var(--vizithink-border-soft)",
          borderRadius: 16,
          padding: "32px 32px 32px 36px",
          overflow: "hidden",
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT2})`,
          }}
        />
        <p style={{ ...manifestoP, marginTop: 0 }}>
          As we work more with AI, the role of the human is to make{" "}
          <strong style={{ color: "var(--vizithink-text)" }}>fewer, better decisions</strong>.
        </p>
        <p style={manifestoP}>
          AI can help with the analysis and research — but the information has to
          be presented clearly. We’re drowning in pages of “deep research” AI slop.
        </p>
        <p style={{ ...manifestoP, marginBottom: 0 }}>
          ViziThink helps you see the road ahead and decide with clarity.
        </p>
      </div>
    </section>
  );
}

function Gallery() {
  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "16px 24px 56px" }}>
      <SectionHeading
        kicker="See it work"
        title="A framework for every decision"
        subtitle="Drop a tool into the chat with a slash command, or just describe your decision and let ViziThink pick."
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 18,
          marginTop: 32,
        }}
      >
        {EXAMPLES.map((ex) => (
          <div key={ex.title} className="vt-card" style={galleryCard}>
            <div style={galleryMock}>{ex.render()}</div>
            <div style={{ padding: "16px 18px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <code style={tagChip}>{ex.tag}</code>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{ex.title}</span>
              </div>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  color: "var(--vizithink-text-muted)",
                }}
              >
                {ex.blurb}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "16px 24px 56px" }}>
      <SectionHeading kicker="From the field" title="Clearer heads, faster calls" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 18,
          marginTop: 32,
        }}
      >
        {TESTIMONIALS.map((t) => (
          <figure key={t.name} className="vt-card" style={quoteCard}>
            <span
              aria-hidden
              className="vizithink-display"
              style={{ fontSize: 40, lineHeight: 1, color: t.tint, display: "block" }}
            >
              “
            </span>
            <blockquote
              style={{
                margin: "4px 0 0",
                fontSize: 15,
                lineHeight: 1.6,
                color: "var(--vizithink-text)",
              }}
            >
              {t.quote}
            </blockquote>
            <figcaption
              style={{ marginTop: 18, fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}
            >
              <span
                aria-hidden
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#0a0c12",
                  background: t.tint,
                  flexShrink: 0,
                }}
              >
                {t.name[0]}
              </span>
              <span>
                <span style={{ fontWeight: 600 }}>{t.name}</span>
                <span style={{ color: "var(--vizithink-text-subtle)" }}> · {t.role}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Waitlist() {
  const [email, setEmail] = useState("");
  const join = trpc.waitlist.join.useMutation();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || join.isPending) return;
    join.mutate({ email: email.trim() });
  };

  return (
    <section
      id="waitlist"
      style={{ maxWidth: 620, margin: "0 auto", padding: "16px 24px 72px", textAlign: "center" }}
    >
      <div
        style={{
          borderRadius: 18,
          padding: "36px 28px 40px",
          background:
            "radial-gradient(420px 200px at 50% 0%, rgba(110, 168, 254, 0.1), transparent 70%), var(--vizithink-surface)",
          border: "1px solid var(--vizithink-border-soft)",
        }}
      >
        <SectionHeading
          kicker="Stay in the loop"
          title="Be first to decide better"
          subtitle="Follow updates and we’ll let you know about new features and early access."
        />

        {join.isSuccess ? (
          <div
            style={{
              marginTop: 28,
              padding: "18px 20px",
              borderRadius: 12,
              background: "var(--vizithink-accent-soft)",
              border: "1px solid var(--vizithink-accent)",
              color: "var(--vizithink-text)",
              fontSize: 15,
            }}
          >
            You’re subscribed — thanks! We’ll keep you posted. ✦
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap", justifyContent: "center" }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email address"
              style={{
                flex: "1 1 240px",
                minWidth: 0,
                padding: "12px 16px",
                fontSize: 15,
                color: "var(--vizithink-text)",
                background: "var(--vizithink-surface-2)",
                border: "1px solid var(--vizithink-border)",
                borderRadius: 10,
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={!valid || join.isPending}
              className={valid && !join.isPending ? "vt-cta" : undefined}
              style={{
                ...primaryBtn,
                cursor: !valid || join.isPending ? "not-allowed" : "pointer",
                opacity: !valid || join.isPending ? 0.55 : 1,
                border: "none",
              }}
            >
              {join.isPending ? "Subscribing…" : "Follow updates"}
            </button>
          </form>
        )}

        {join.isError && (
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--vizithink-option)" }}>
            {join.error.message}
          </p>
        )}
      </div>
    </section>
  );
}

function SectionHeading({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--vizithink-accent)",
          fontWeight: 600,
        }}
      >
        {kicker}
      </div>
      <h2
        className="vizithink-display"
        style={{ fontSize: 32, margin: "10px 0 0", letterSpacing: "-0.01em", fontWeight: 500 }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            color: "var(--vizithink-text-muted)",
            fontSize: 15,
            lineHeight: 1.5,
            maxWidth: 460,
            margin: "12px auto 0",
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ---- SVG mocks (stand-ins for screenshots) ----
   All share a 200×130 viewBox and draw with theme tokens so they read as real
   product surfaces, not abstract placeholders. */

const MOCK_VB = "0 0 200 130";

function TwoByTwoMock() {
  const dot = (x: number, y: number, r: number, c: string) => (
    <g key={`${x}${y}`}>
      <circle cx={x} cy={y} r={r + 4} fill={c} opacity={0.18} />
      <circle cx={x} cy={y} r={r} fill={c} />
    </g>
  );
  return (
    <svg viewBox={MOCK_VB} style={mockSvg} aria-hidden>
      <rect x="18" y="10" width="164" height="110" rx="8" fill="var(--vizithink-bg)" stroke="var(--vizithink-border)" />
      {/* top-right quadrant tint = the winning zone */}
      <path d="M100,10 h74 a8,8 0 0 1 8,8 v47 h-82 Z" fill="var(--vizithink-accent)" opacity={0.07} />
      <line x1="100" y1="10" x2="100" y2="120" stroke="var(--vizithink-border)" strokeDasharray="3 4" />
      <line x1="18" y1="65" x2="182" y2="65" stroke="var(--vizithink-border)" strokeDasharray="3 4" />
      {dot(62, 88, 5, "var(--vizithink-framework)")}
      {dot(84, 44, 5, "var(--vizithink-merged)")}
      {dot(130, 78, 5, "var(--vizithink-option)")}
      {dot(146, 32, 6, "var(--vizithink-accent)")}
      <circle cx="146" cy="32" r="2.2" fill="#dbe9ff" />
    </svg>
  );
}

function SankeyMock() {
  const band = (d: string, w: number, c: string) => (
    <path key={d} d={d} fill="none" stroke={c} strokeWidth={w} strokeOpacity={0.45} />
  );
  return (
    <svg viewBox={MOCK_VB} style={mockSvg} aria-hidden>
      {band("M26,62 C80,62 80,30 140,30", 20, "var(--vizithink-merged)")}
      {band("M26,80 C80,80 80,68 140,68", 13, "var(--vizithink-text-subtle)")}
      {band("M26,93 C80,93 80,102 140,102", 9, "var(--vizithink-bad)")}
      <rect x="20" y="50" width="7" height="50" rx="2" fill="var(--vizithink-accent)" />
      <rect x="140" y="20" width="7" height="20" rx="2" fill="var(--vizithink-merged)" />
      <rect x="140" y="61" width="7" height="13" rx="2" fill="var(--vizithink-text-subtle)" />
      <rect x="140" y="97" width="7" height="9" rx="2" fill="var(--vizithink-bad)" />
      <rect x="153" y="24" width="30" height="5" rx="2.5" fill="var(--vizithink-border)" />
      <rect x="153" y="64" width="24" height="5" rx="2.5" fill="var(--vizithink-border)" />
      <rect x="153" y="98" width="20" height="5" rx="2.5" fill="var(--vizithink-border)" />
    </svg>
  );
}

function EisenhowerMock() {
  const cell = (x: number, y: number, c: string) => (
    <rect key={`${x}${y}`} x={x} y={y} width="76" height="50" rx="7" fill={c} opacity={0.16} />
  );
  const chip = (x: number, y: number, w: number, c: string) => (
    <rect key={`c${x}${y}`} x={x} y={y} width={w} height="9" rx="4.5" fill={c} opacity={0.85} />
  );
  return (
    <svg viewBox={MOCK_VB} style={mockSvg} aria-hidden>
      {cell(20, 12, "var(--vizithink-merged)")}
      {cell(104, 12, "var(--vizithink-concept)")}
      {cell(20, 68, "var(--vizithink-option)")}
      {cell(104, 68, "var(--vizithink-framework)")}
      {chip(28, 22, 40, "var(--vizithink-merged)")}
      {chip(28, 37, 30, "var(--vizithink-merged)")}
      {chip(112, 22, 36, "var(--vizithink-concept)")}
      {chip(28, 78, 34, "var(--vizithink-option)")}
      {chip(112, 78, 42, "var(--vizithink-framework)")}
      {chip(112, 93, 26, "var(--vizithink-framework)")}
    </svg>
  );
}

function FactorsMock() {
  const row = (y: number, t: number) => (
    <g key={y}>
      <rect x="24" y={y - 12} width={44} height="6" rx="3" fill="var(--vizithink-border)" />
      <line x1="24" y1={y} x2="176" y2={y} stroke="var(--vizithink-border)" strokeWidth="5" strokeLinecap="round" />
      <line x1="24" y1={y} x2={t} y2={y} stroke="url(#fm-g)" strokeWidth="5" strokeLinecap="round" />
      <circle cx={t} cy={y} r="7" fill="#dbe9ff" stroke="var(--vizithink-accent)" strokeWidth="2.5" />
    </g>
  );
  return (
    <svg viewBox={MOCK_VB} style={mockSvg} aria-hidden>
      <defs>
        <linearGradient id="fm-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--vizithink-accent-2)" />
          <stop offset="100%" stopColor="var(--vizithink-accent)" />
        </linearGradient>
      </defs>
      {row(34, 130)}
      {row(74, 64)}
      {row(114, 156)}
    </svg>
  );
}

function ProConMock() {
  const bar = (y: number, w: number, pro: boolean) => (
    <g key={y}>
      <rect
        x={pro ? 100 : 100 - w}
        y={y}
        width={w}
        height="13"
        rx="5"
        fill={pro ? "var(--vizithink-merged)" : "var(--vizithink-option)"}
        opacity={0.8}
      />
    </g>
  );
  return (
    <svg viewBox={MOCK_VB} style={mockSvg} aria-hidden>
      <line x1="100" y1="10" x2="100" y2="120" stroke="var(--vizithink-border)" />
      {bar(18, 64, true)}
      {bar(38, 42, true)}
      {bar(58, 52, false)}
      {bar(78, 74, true)}
      {bar(98, 30, false)}
    </svg>
  );
}

function TreeMock() {
  const link = (d: string) => (
    <path key={d} d={d} fill="none" stroke="var(--vizithink-border)" strokeWidth="1.6" />
  );
  const node = (x: number, y: number, c: string, r = 6) => (
    <g key={`${x}${y}`}>
      <circle cx={x} cy={y} r={r + 4} fill={c} opacity={0.16} />
      <circle cx={x} cy={y} r={r} fill={c} />
    </g>
  );
  return (
    <svg viewBox={MOCK_VB} style={mockSvg} aria-hidden>
      {link("M36,65 C70,65 70,30 104,30")}
      {link("M36,65 C70,65 70,100 104,100")}
      {link("M104,30 C134,30 134,16 162,16")}
      {link("M104,30 C134,30 134,48 162,48")}
      {link("M104,100 C134,100 134,84 162,84")}
      {link("M104,100 C134,100 134,114 162,114")}
      {node(36, 65, "var(--vizithink-accent)", 8)}
      {node(104, 30, "var(--vizithink-framework)")}
      {node(104, 100, "var(--vizithink-option)")}
      {node(162, 16, "var(--vizithink-merged)", 5)}
      {node(162, 48, "var(--vizithink-text-subtle)", 5)}
      {node(162, 84, "var(--vizithink-merged)", 5)}
      {node(162, 114, "var(--vizithink-bad)", 5)}
    </svg>
  );
}

/* ---- shared styles ---- */

const windowDot = (c: string): CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: 999,
  background: c,
  opacity: 0.75,
  flexShrink: 0,
});

const mockSvg: CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
};

const primaryBtn: CSSProperties = {
  display: "inline-block",
  padding: "13px 24px",
  fontSize: 15,
  fontWeight: 600,
  color: "#0a0c12",
  background: `linear-gradient(115deg, ${ACCENT}, ${ACCENT2})`,
  border: "none",
  borderRadius: 11,
  textDecoration: "none",
  cursor: "pointer",
};

const secondaryBtn: CSSProperties = {
  display: "inline-block",
  padding: "13px 24px",
  fontSize: 15,
  fontWeight: 600,
  color: "var(--vizithink-text)",
  background: "var(--vizithink-surface-2)",
  border: "1px solid var(--vizithink-border)",
  borderRadius: 11,
  textDecoration: "none",
  cursor: "pointer",
};

// Large clickable "speech bubble" for an example prompt. The tail is a rotated
// square pinned to the bottom-left (matching the bubble's bg + border colour).
const bubble: CSSProperties = {
  position: "relative",
  display: "block",
  background: "var(--vizithink-surface)",
  border: "1.5px solid var(--vizithink-accent)",
  borderRadius: 22,
  padding: "24px 28px",
  fontSize: 21,
  lineHeight: 1.4,
  fontWeight: 500,
  color: "var(--vizithink-text)",
  textDecoration: "none",
  cursor: "pointer",
  boxShadow: "0 1px 2px #0004",
};

const bubbleTail: CSSProperties = {
  position: "absolute",
  bottom: -10,
  left: 36,
  width: 20,
  height: 20,
  background: "var(--vizithink-surface)",
  borderLeft: "1.5px solid var(--vizithink-accent)",
  borderBottom: "1.5px solid var(--vizithink-accent)",
  borderBottomLeftRadius: 4,
  transform: "rotate(-45deg)",
};

const bubbleArrow: CSSProperties = {
  position: "absolute",
  right: 20,
  bottom: 18,
  width: 30,
  height: 30,
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#0a0c12",
  fontSize: 16,
  fontWeight: 700,
};

const manifestoP: CSSProperties = {
  margin: "16px 0 0",
  fontSize: 17,
  lineHeight: 1.6,
  color: "var(--vizithink-text-muted)",
};

const galleryCard: CSSProperties = {
  background: "var(--vizithink-surface)",
  border: "1px solid var(--vizithink-border-soft)",
  borderRadius: 14,
  overflow: "hidden",
};

const galleryMock: CSSProperties = {
  height: 150,
  background:
    "radial-gradient(220px 120px at 50% 0%, rgba(110, 168, 254, 0.05), transparent 70%), var(--vizithink-bg)",
  borderBottom: "1px solid var(--vizithink-border-soft)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 12,
};

const tagChip: CSSProperties = {
  fontSize: 11,
  fontFamily: "ui-monospace, monospace",
  color: "var(--vizithink-accent)",
  background: "var(--vizithink-accent-soft)",
  padding: "2px 6px",
  borderRadius: 5,
};

const quoteCard: CSSProperties = {
  background: "var(--vizithink-surface)",
  border: "1px solid var(--vizithink-border-soft)",
  borderRadius: 14,
  padding: "18px 22px 22px",
  margin: 0,
};
