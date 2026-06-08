import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type CSSProperties, type ReactElement } from "react";
import { trpc } from "../lib/trpc";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

// One example tile in the gallery. We don't have real screenshots yet, so each
// example is a lightweight CSS mock of a widget the app produces — enough to
// communicate the "visual thinking framework" promise.
interface Example {
  tag: string;
  title: string;
  blurb: string;
  render: () => ReactElement;
}

const ACCENT = "var(--vizithink-accent)";

const EXAMPLES: Example[] = [
  {
    tag: "/2x2",
    title: "2×2 Matrix",
    blurb: "Plot options against two axes to see the trade-offs at a glance.",
    render: TwoByTwoMock,
  },
  {
    tag: "/pc",
    title: "Pros & Cons",
    blurb: "Weigh each factor for and against — no slog, just the signal.",
    render: ProConMock,
  },
  {
    tag: "/eis",
    title: "Eisenhower",
    blurb: "Sort by urgent vs. important so you act on what matters.",
    render: EisenhowerMock,
  },
  {
    tag: "/pm",
    title: "Pre-mortem",
    blurb: "Assume it failed, work backwards, and de-risk before you commit.",
    render: PremortemMock,
  },
];

const TESTIMONIALS = [
  {
    quote:
      "I used to drown in twelve-tab research spirals. ViziThink got me to a decision in one afternoon.",
    name: "Maya R.",
    role: "Founder, seed-stage SaaS",
  },
  {
    quote:
      "The 2×2 is deceptively simple. Seeing the options laid out killed three weeks of going in circles.",
    name: "Daniel K.",
    role: "Product lead",
  },
  {
    quote:
      "It’s the first AI tool that made me think more clearly instead of just handing me a wall of text.",
    name: "Priya S.",
    role: "Engineering manager",
  },
];

function LandingPage() {
  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <Hero />
      <Manifesto />
      <Gallery />
      <Testimonials />
      <Waitlist />
      <footer
        style={{
          textAlign: "center",
          padding: "32px 24px 48px",
          color: "var(--vizithink-text-subtle)",
          fontSize: 13,
        }}
      >
        ViziThink.com · AI Decision Buddy
      </footer>
    </div>
  );
}

function Hero() {
  return (
    <section
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "72px 24px 48px",
        textAlign: "center",
      }}
    >
      <img
        src="/logo.svg"
        alt="ViziThink"
        width={64}
        height={64}
        style={{ display: "block", margin: "0 auto 20px" }}
      />
      <div
        style={{
          display: "inline-block",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.01em",
          color: "var(--vizithink-accent)",
          background: "var(--vizithink-accent-soft)",
          padding: "5px 12px",
          borderRadius: 999,
          marginBottom: 20,
        }}
      >
        ViziThink.com
      </div>
      <h1
        className="vizithink-display"
        style={{ fontSize: 52, lineHeight: 1.05, margin: 0, letterSpacing: "-0.02em" }}
      >
        Your AI Decision Buddy
      </h1>
      <p
        style={{
          color: "var(--vizithink-text-muted)",
          marginTop: 18,
          fontSize: 19,
          lineHeight: 1.5,
          maxWidth: 560,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        Make complex decisions with visual thinking frameworks. ViziThink turns the
        churn of analysis into a clear picture you can act on.
      </p>
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          marginTop: 32,
          flexWrap: "wrap",
        }}
      >
        <Link to="/chat" style={primaryBtn}>
          Make a decision →
        </Link>
        <a href="#waitlist" style={secondaryBtn}>
          Follow updates
        </a>
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
          background: "var(--vizithink-surface)",
          border: "1px solid var(--vizithink-border-soft)",
          borderRadius: 16,
          padding: "32px 32px",
        }}
      >
        <p style={{ ...manifestoP, marginTop: 0 }}>
          As we work more with AI, the role of the human is to make{" "}
          <strong style={{ color: "var(--vizithink-text)" }}>fewer, better decisions</strong>.
        </p>
        <p style={manifestoP}>
          AI can help with the analysis and research — but the information has to
          be presented clearly. We’re drowning in pages of “deep research” AI slop.
        </p>
        <p style={{ ...manifestoP, marginBottom: 0 }}>
          ViziThink helps you get to the point quickly.
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
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 18,
          marginTop: 32,
        }}
      >
        {EXAMPLES.map((ex) => (
          <div key={ex.title} style={galleryCard}>
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
          <figure key={t.name} style={quoteCard}>
            <blockquote
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.6,
                color: "var(--vizithink-text)",
              }}
            >
              “{t.quote}”
            </blockquote>
            <figcaption style={{ marginTop: 16, fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{t.name}</span>
              <span style={{ color: "var(--vizithink-text-subtle)" }}> · {t.role}</span>
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
      style={{ maxWidth: 560, margin: "0 auto", padding: "16px 24px 64px", textAlign: "center" }}
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
        style={{ fontSize: 30, margin: "10px 0 0", letterSpacing: "-0.01em" }}
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

/* ---- styled mocks (stand-ins for screenshots) ---- */

function TwoByTwoMock() {
  const dot = (x: number, y: number, color: string): CSSProperties => ({
    position: "absolute",
    left: `${x}%`,
    top: `${y}%`,
    width: 14,
    height: 14,
    borderRadius: 999,
    background: color,
    transform: "translate(-50%, -50%)",
  });
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div style={{ position: "absolute", inset: "10%", border: "1px solid var(--vizithink-border)" }} />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "10%",
          bottom: "10%",
          width: 1,
          background: "var(--vizithink-border)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "10%",
          right: "10%",
          height: 1,
          background: "var(--vizithink-border)",
        }}
      />
      <div style={dot(32, 32, "var(--vizithink-option)")} />
      <div style={dot(70, 28, "var(--vizithink-concept)")} />
      <div style={dot(40, 68, "var(--vizithink-framework)")} />
      <div style={dot(74, 72, "var(--vizithink-merged)")} />
    </div>
  );
}

function ProConMock() {
  const row = (label: string, pro: boolean) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          background: pro ? "var(--vizithink-merged)" : "var(--vizithink-option)",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          background: "var(--vizithink-border)",
        }}
      />
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 4px", width: "100%" }}>
      {row("a", true)}
      {row("b", true)}
      {row("c", false)}
      {row("d", true)}
      {row("e", false)}
    </div>
  );
}

function EisenhowerMock() {
  const cell = (color: string): CSSProperties => ({
    background: color,
    opacity: 0.22,
    borderRadius: 6,
  });
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: 8,
        width: "100%",
        height: "100%",
        padding: 6,
      }}
    >
      <div style={cell("var(--vizithink-merged)")} />
      <div style={cell("var(--vizithink-concept)")} />
      <div style={cell("var(--vizithink-option)")} />
      <div style={cell("var(--vizithink-framework)")} />
    </div>
  );
}

function PremortemMock() {
  const line = (w: string): CSSProperties => ({
    height: 8,
    width: w,
    borderRadius: 4,
    background: "var(--vizithink-border)",
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9, padding: "10px 6px", width: "100%" }}>
      <div style={{ ...line("55%"), background: "var(--vizithink-option)" }} />
      <div style={line("90%")} />
      <div style={line("78%")} />
      <div style={line("84%")} />
      <div style={line("46%")} />
    </div>
  );
}

/* ---- shared styles ---- */

const primaryBtn: CSSProperties = {
  display: "inline-block",
  padding: "12px 22px",
  fontSize: 15,
  fontWeight: 600,
  color: "#0f1115",
  background: ACCENT,
  border: "none",
  borderRadius: 10,
  textDecoration: "none",
  cursor: "pointer",
};

const secondaryBtn: CSSProperties = {
  display: "inline-block",
  padding: "12px 22px",
  fontSize: 15,
  fontWeight: 600,
  color: "var(--vizithink-text)",
  background: "var(--vizithink-surface-2)",
  border: "1px solid var(--vizithink-border)",
  borderRadius: 10,
  textDecoration: "none",
  cursor: "pointer",
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
  height: 130,
  background: "var(--vizithink-bg)",
  borderBottom: "1px solid var(--vizithink-border-soft)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 14,
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
  padding: "22px 22px",
  margin: 0,
};
