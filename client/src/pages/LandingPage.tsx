import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

// ─── CountUp ─────────────────────────────────────────────────────────────────

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasRun.current) {
        hasRun.current = true;
        const start = Date.now();
        const duration = 1600;
        const tick = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * to));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [to]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// ─── Floating Quote Card ──────────────────────────────────────────────────────

function FloatingCard({
  vendor, price, status, delay = 0, rotation = "-3deg",
  className = "",
}: {
  vendor: string; price: string; status: "done" | "running" | "best";
  delay?: number; rotation?: string; className?: string;
}) {
  const statusColor = status === "done" ? "text-green-400" : status === "best" ? "text-teal-400" : "text-amber-400";
  const statusText = status === "done" ? "✓ Quote received" : status === "best" ? "★ Best price" : "● Navigating form…";

  return (
    <motion.div
      className={`absolute backdrop-blur-md rounded-xl border border-white/10 px-4 py-3 w-52 ${className}`}
      style={{
        background: "rgba(255,255,255,0.06)",
        rotate: rotation,
        boxShadow: status === "best"
          ? "0 0 0 1px rgba(13,148,136,0.4), 0 8px 32px rgba(0,0,0,0.4)"
          : "0 8px 32px rgba(0,0,0,0.4)",
      }}
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 3.5 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-white/90">{vendor}</span>
        {status === "best" && (
          <span className="text-[9px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-1.5 py-0.5 rounded font-bold tracking-widest">BEST</span>
        )}
      </div>
      <div className="font-mono text-lg font-bold text-white">{price}</div>
      <div className={`text-[10px] mt-1 font-medium ${statusColor} flex items-center gap-1`}>
        {status === "running" && <span className="animate-blink">●</span>}
        {statusText}
      </div>
    </motion.div>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────

function FeatureCard({ icon, title, description }: {
  icon: string; title: string; description: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="glow-card bg-white border border-slate-200 rounded-xl p-6 transition-all duration-200"
    >
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="text-sm font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </motion.div>
  );
}

// ─── Step ─────────────────────────────────────────────────────────────────────

function Step({ number, title, description, isLast = false }: {
  number: string; title: string; description: string; isLast?: boolean;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <div ref={ref} className="relative flex gap-6">
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.1, type: "spring", stiffness: 300 }}
          className="w-10 h-10 rounded-full bg-teal-600 text-white text-sm font-bold flex items-center justify-center shrink-0 z-10"
        >
          {number}
        </motion.div>
        {!isLast && (
          <motion.div
            initial={{ height: 0 }}
            animate={inView ? { height: "100%" } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="w-px bg-teal-200 flex-1 mt-2"
          />
        )}
      </div>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="pb-10"
      >
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 leading-relaxed max-w-sm">{description}</p>
      </motion.div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(10,15,30,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "none",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center">
            <span className="text-teal-400 text-xs font-bold">QP</span>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">QuotePilot</span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-7">
          {["Features", "How it Works", "Demo"].map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}
              className="text-sm text-white/60 hover:text-white transition-colors duration-150 font-medium"
            >
              {link}
            </a>
          ))}
        </div>

        {/* CTA */}
        <Link
          to="/"
          className="shimmer-btn inline-flex items-center gap-2 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-all duration-150 hover:shadow-lg hover:shadow-teal-500/25"
        >
          Open Dashboard
          <span className="text-teal-200">→</span>
        </Link>
      </div>
    </motion.nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

const TERMINAL_LINES = [
  "$ quotepilot run --rfq \"500 Custom Boxes\"",
  "  → Dispatching agents to 4 vendors...",
  "  [Packlane]    STARTED · run a3f8…",
  "  [CustomBoxes] STARTED · run 9c1d…",
  "  [Packlane]    Navigating quote form…",
  "  [UPrinting]   STARTED · run 7b2e…",
  "  [CustomBoxes] Filling in dimensions…",
  "  [Packlane]    Quote extracted ✓",
];

function Hero() {
  const [terminalLines, setTerminalLines] = useState<string[]>([]);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < TERMINAL_LINES.length) {
        setTerminalLines((prev) => [...prev, TERMINAL_LINES[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 420);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="landing-hero relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6">
      {/* Aurora background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="animate-aurora-1 absolute -top-32 -left-32 w-[700px] h-[700px] rounded-full opacity-[0.15] blur-[100px]"
          style={{ background: "radial-gradient(circle at center, #0D9488, transparent 70%)" }}
        />
        <div
          className="animate-aurora-2 absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full opacity-[0.12] blur-[80px]"
          style={{ background: "radial-gradient(circle at center, #2563EB, transparent 70%)" }}
        />
        <div
          className="animate-aurora-3 absolute top-1/2 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.1] blur-[80px]"
          style={{ background: "radial-gradient(circle at center, #0D9488, transparent 70%)" }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-400 text-xs font-semibold mb-8 tracking-wide"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              TinyFish Hackathon — AI Procurement Agent
            </motion.div>

            <motion.h1
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="text-[3.5rem] lg:text-[4.5rem] font-bold leading-[1.05] tracking-tight text-white mb-6"
            >
              {["Stop", "Emailing", "Vendors."].map((word, i) => (
                <motion.span key={i} variants={fadeUp} className="block">
                  {i === 2 ? (
                    <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #2dd4bf, #0D9488)" }}>
                      {word}
                    </span>
                  ) : word}
                </motion.span>
              ))}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-white/60 text-lg leading-relaxed mb-10 max-w-lg"
            >
              QuotePilot dispatches autonomous AI agents to fill quote forms across all your vendors simultaneously — then surfaces the best price in a clean comparison table.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.5 }}
              className="flex flex-wrap items-center gap-4"
            >
              <Link
                to="/"
                className="shimmer-btn inline-flex items-center gap-2.5 text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transition-shadow duration-200"
              >
                Open Dashboard
                <span>→</span>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-white/70 hover:text-white font-medium text-sm px-5 py-3.5 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-150 backdrop-blur-sm"
              >
                See How It Works
                <span className="text-xs">↓</span>
              </a>
            </motion.div>

            {/* Social proof line */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="flex items-center gap-4 mt-10"
            >
              <div className="flex -space-x-1.5">
                {["#0D9488", "#2563EB", "#7C3AED", "#DB2777"].map((c, i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900" style={{ background: c }} />
                ))}
              </div>
              <p className="text-xs text-white/40">
                <span className="text-white/70 font-semibold">45 min</span> saved per vendor quote · powered by TinyFish AI
              </p>
            </motion.div>
          </div>

          {/* Right: Terminal + floating cards */}
          <div className="relative hidden lg:block" style={{ height: "480px" }}>
            {/* Terminal window */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="terminal rounded-2xl overflow-hidden border border-white/10 w-full"
              style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)" }}
            >
              {/* Titlebar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.03]">
                <span className="w-3 h-3 rounded-full bg-red-500/60" />
                <span className="w-3 h-3 rounded-full bg-amber-500/60" />
                <span className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="ml-4 text-[11px] text-slate-500 font-mono">agent.log — QuotePilot</span>
              </div>
              {/* Log lines */}
              <div className="px-4 py-4 space-y-1.5 min-h-[220px]">
                <AnimatePresence>
                  {terminalLines.map((line, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`text-[11px] font-mono leading-relaxed ${
                        line?.includes("✓") ? "text-green-400" :
                        line?.includes("STARTED") ? "text-teal-400" :
                        line?.includes("$") ? "text-white" :
                        "text-slate-400"
                      }`}
                    >
                      {line}
                    </motion.p>
                  ))}
                </AnimatePresence>
                {terminalLines.length < 8 && (
                  <span className="inline-block w-2 h-3.5 bg-teal-500/70 animate-pulse" />
                )}
              </div>
            </motion.div>

            {/* Floating quote cards */}
            <FloatingCard
              vendor="Packlane"
              price="$0.87/unit"
              status="best"
              delay={0}
              rotation="-4deg"
              className="-bottom-6 -left-8"
            />
            <FloatingCard
              vendor="The Custom Boxes"
              price="$0.92/unit"
              status="done"
              delay={0.8}
              rotation="3deg"
              className="-bottom-2 right-0"
            />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
      >
        <span className="text-xs text-white/30 font-medium tracking-wider uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent"
        />
      </motion.div>
    </section>
  );
}

// ─── Problem section ──────────────────────────────────────────────────────────

function ProblemSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const pains = [
    {
      icon: "📧",
      title: "Hours of email chains",
      description: "Writing individual emails to 5–15 vendors, waiting days for responses, chasing follow-ups. All for a single RFQ.",
    },
    {
      icon: "📊",
      title: "Manual spreadsheet hell",
      description: "Copy-pasting quotes into spreadsheets, reformatting prices, trying to compare apples to oranges.",
    },
    {
      icon: "⏳",
      title: "Missed best prices",
      description: "By the time you've heard from 3 vendors, the quotes from 2 weeks ago are already expired.",
    },
  ];

  return (
    <section className="py-24 bg-slate-50" id="features">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          ref={ref}
          variants={stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="text-center mb-16"
        >
          <motion.p variants={fadeUp} className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">
            The Problem
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-slate-900 leading-tight">
            Procurement hasn't changed<br />in 20 years.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-slate-500 mt-4 max-w-lg mx-auto leading-relaxed">
            Getting competitive quotes still means dozens of browser tabs, copy-paste marathons, and waiting games.
          </motion.p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid md:grid-cols-3 gap-6"
        >
          {pains.map((pain) => (
            <motion.div
              key={pain.title}
              variants={fadeUp}
              className="bg-white border border-slate-200 rounded-xl p-6 relative overflow-hidden"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
            >
              <div
                className="absolute top-0 right-0 w-32 h-32 opacity-5 text-[80px] leading-none select-none pointer-events-none"
              >
                {pain.icon}
              </div>
              <div className="text-3xl mb-4">{pain.icon}</div>
              <h3 className="font-semibold text-slate-800 mb-2">{pain.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{pain.description}</p>
              <div className="mt-4 flex items-center gap-2">
                <div className="h-0.5 flex-1 bg-red-200 rounded" />
                <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">Time wasted</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorksSection() {
  return (
    <section className="py-24 bg-white" id="how-it-works">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">How It Works</p>
          <h2 className="text-3xl font-bold text-slate-900">From RFQ to best price<br />in three steps.</h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <Step
              number="01"
              title="Create your RFQ in seconds"
              description="Describe your product — type, quantity, dimensions, material. Your contact info is pre-filled from your profile. Pick your vendors from the catalog."
            />
            <Step
              number="02"
              title="AI agents navigate every vendor"
              description="QuotePilot dispatches one autonomous agent per vendor simultaneously. Each agent finds the quote form, fills it out with your specs, and submits it — just like a human would."
            />
            <Step
              number="03"
              title="Compare quotes, award the best"
              description="Results stream in real time. A sortable table shows unit price, total, lead time, and MOQ. One click awards the winner and logs your decision."
              isLast
            />
          </div>

          {/* Diagram */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.2 }}
            className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-3"
          >
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Live Agent View</div>
            {[
              { vendor: "Packlane", status: "completed", price: "$0.87/unit", color: "bg-green-500" },
              { vendor: "The Custom Boxes", status: "completed", price: "$0.92/unit", color: "bg-green-500" },
              { vendor: "UPrinting", status: "running", price: "Filling form…", color: "bg-teal-500" },
              { vendor: "VistaPrint", status: "queued", price: "Queued", color: "bg-slate-300" },
            ].map((v) => (
              <div key={v.vendor} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${v.color} ${v.status === "running" ? "animate-pulse" : ""}`} />
                <span className="text-sm font-medium text-slate-800 flex-1">{v.vendor}</span>
                <span className={`text-xs font-mono ${v.status === "completed" ? "text-teal-700 font-semibold" : "text-slate-400"}`}>
                  {v.price}
                </span>
                {v.status === "completed" && (
                  <span className="text-[10px] bg-green-50 border border-green-200 text-green-700 px-1.5 py-0.5 rounded font-semibold">✓</span>
                )}
              </div>
            ))}
            <div className="text-center pt-2">
              <span className="inline-flex items-center gap-2 text-xs text-teal-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                2 of 4 quotes received
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

function FeaturesSection() {
  const features = [
    { icon: "⚡", title: "Simultaneous dispatch", description: "All vendor agents run in parallel — not one by one. Get all quotes in the time it takes to do one." },
    { icon: "📡", title: "Real-time streaming", description: "Watch agent progress live via Socket.io. See every step, every form field, every result as it happens." },
    { icon: "📊", title: "Analytics dashboard", description: "Track vendor reliability, average pricing, success rates, and hours saved across all your RFQs." },
    { icon: "📋", title: "RFQ Templates", description: "Save any RFQ as a reusable template. One click to pre-fill specs for repeat product lines." },
    { icon: "📤", title: "CSV Export", description: "Export the full quote comparison table to CSV with one click. Import straight into your ERP." },
    { icon: "🏆", title: "Award & track", description: "Select a winning quote, add a decision note, and mark the RFQ as awarded — full procurement audit trail." },
    { icon: "🔁", title: "Re-run failed vendors", description: "If an agent fails on a vendor, re-run just those failures without losing your successful quotes." },
    { icon: "📧", title: "Email notifications", description: "Get an email when your RFQ run completes with a summary of quotes collected. Configure via SMTP." },
  ];

  return (
    <section className="py-24 bg-slate-50" id="features">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">Everything Included</p>
          <h2 className="text-3xl font-bold text-slate-900">Built for serious procurement.</h2>
          <p className="text-slate-500 mt-4 max-w-md mx-auto">No duct tape, no manual steps. A complete autonomous quoting workflow from RFQ to awarded contract.</p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function StatsSection() {
  const stats = [
    { value: 45, suffix: " min", label: "saved per vendor quote", sub: "vs. manual email outreach" },
    { value: 100, suffix: "%", label: "automated form filling", sub: "no human in the loop" },
    { value: 8, suffix: "×", label: "faster than email RFQ", sub: "parallel agent dispatch" },
    { value: 60, suffix: "+", label: "vendor actions tracked", sub: "full audit log per run" },
  ];

  return (
    <section className="py-24 landing-hero relative overflow-hidden">
      {/* Subtle aurora */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="animate-aurora-1 absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.08] blur-[80px]"
          style={{ background: "radial-gradient(circle, #0D9488, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-xs font-semibold text-teal-400 uppercase tracking-widest mb-3">By the Numbers</p>
          <h2 className="text-3xl font-bold text-white">The math speaks for itself.</h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {stats.map((s) => (
            <motion.div
              key={s.label}
              variants={fadeUp}
              className="text-center rounded-2xl border border-white/10 p-6"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <div className="text-4xl font-bold font-mono text-teal-400 leading-none mb-2">
                <CountUp to={s.value} suffix={s.suffix} />
              </div>
              <div className="text-sm font-semibold text-white/80 mb-1">{s.label}</div>
              <div className="text-[11px] text-white/30 font-mono">{s.sub}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Demo preview ─────────────────────────────────────────────────────────────

function DemoSection() {
  return (
    <section className="py-24 bg-white" id="demo">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">The Product</p>
          <h2 className="text-3xl font-bold text-slate-900">Everything in one place.</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="grid md:grid-cols-3 gap-4"
        >
          {[
            {
              title: "Quote Comparison",
              tag: "Quotes tab",
              content: (
                <div className="space-y-2">
                  {[
                    { name: "Packlane", price: "$0.87", best: true },
                    { name: "Custom Boxes", price: "$0.92", best: false },
                    { name: "UPrinting", price: "$1.04", best: false },
                  ].map((v) => (
                    <div key={v.name} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${v.best ? "bg-teal-50 border-teal-200" : "bg-slate-50 border-slate-200"}`}>
                      <span className="font-medium text-slate-800">{v.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold ${v.best ? "text-teal-700" : "text-slate-600"}`}>{v.price}/unit</span>
                        {v.best && <span className="text-[9px] bg-teal-600 text-white px-1.5 py-0.5 rounded font-bold tracking-widest">BEST</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              title: "Agent Terminal",
              tag: "Activity tab",
              dark: true,
              content: (
                <div className="terminal rounded-lg px-3 py-2 text-[10px] space-y-1.5" style={{ background: "#0F172A" }}>
                  {[
                    { t: "12:04:01", type: "STARTED", v: "Packlane", msg: "Agent started" },
                    { t: "12:04:03", type: "PROGRESS", v: "Packlane", msg: "Navigating quote form…" },
                    { t: "12:04:11", type: "COMPLETE", v: "Packlane", msg: "Quote extracted ✓" },
                    { t: "12:04:12", type: "STARTED", v: "UPrinting", msg: "Agent started" },
                  ].map((l, i) => (
                    <div key={i} className="flex gap-2 font-mono">
                      <span className="text-slate-600 shrink-0">{l.t}</span>
                      <span className={`shrink-0 ${l.type === "COMPLETE" ? "text-green-400" : l.type === "STARTED" ? "text-teal-400" : "text-slate-500"}`}>[{l.type.slice(0,6)}]</span>
                      <span className="text-slate-300 truncate">{l.msg}</span>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              title: "Analytics",
              tag: "Analytics page",
              content: (
                <div className="space-y-2">
                  {[
                    { name: "Packlane", pct: 92, color: "bg-green-500" },
                    { name: "UPrinting", pct: 78, color: "bg-teal-500" },
                    { name: "VistaPrint", pct: 45, color: "bg-amber-500" },
                  ].map((v) => (
                    <div key={v.name} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-24 shrink-0">{v.name}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${v.color}`}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${v.pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                        />
                      </div>
                      <span className="text-xs font-mono text-slate-500 w-8 text-right">{v.pct}%</span>
                    </div>
                  ))}
                </div>
              ),
            },
          ].map((panel) => (
            <div key={panel.title} className="border border-slate-200 rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">{panel.title}</span>
                <span className="text-[10px] text-teal-600 font-mono bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">{panel.tag}</span>
              </div>
              <div className="p-4">{panel.content}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section className="py-28 landing-hero relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="animate-aurora-2 absolute -top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-[0.12] blur-[100px]"
          style={{ background: "radial-gradient(circle, #0D9488, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.p variants={fadeUp} className="text-xs font-semibold text-teal-400 uppercase tracking-widest mb-4">
            Ready when you are
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
            Stop chasing quotes.<br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #2dd4bf, #0D9488)" }}>
              Start deploying agents.
            </span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-white/50 text-lg mb-10 leading-relaxed">
            The full procurement workflow — RFQ creation, agent dispatch, live tracking, comparison, and award — in one clean dashboard.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link
              to="/"
              className="shimmer-btn inline-flex items-center gap-3 text-white font-bold text-base px-8 py-4 rounded-xl shadow-xl shadow-teal-500/20 hover:shadow-teal-500/35 transition-shadow duration-200"
            >
              Open Dashboard
              <span className="text-lg">→</span>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-white/5 py-10">
      <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center">
            <span className="text-teal-400 text-[9px] font-bold">QP</span>
          </div>
          <span className="text-white/50 text-sm font-medium">QuotePilot</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="text-xs text-white/30 hover:text-white/60 transition-colors">Features</a>
          <a href="#how-it-works" className="text-xs text-white/30 hover:text-white/60 transition-colors">How it Works</a>
          <Link to="/" className="text-xs text-teal-500 hover:text-teal-400 font-semibold transition-colors">Dashboard →</Link>
        </div>
        <p className="text-xs text-white/20 font-mono">
          Built for TinyFish Hackathon · March 2026
        </p>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <Hero />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <DemoSection />
      <StatsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
