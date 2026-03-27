import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import createGlobe from "cobe";

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.11 } },
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconZap({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function IconTerminal({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}
function IconPackage({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function IconBarChart({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function IconShield({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconSearch({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IconClock({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconGlobe({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function IconTrophy({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 21 12 17 16 21" /><line x1="12" y1="17" x2="12" y2="11" />
      <path d="M7 4H4a2 2 0 0 0-2 2v2a4 4 0 0 0 4 4h.5" />
      <path d="M17 4h3a2 2 0 0 1 2 2v2a4 4 0 0 1-4 4h-.5" />
      <rect x="7" y="2" width="10" height="10" rx="1" />
    </svg>
  );
}
function IconFile({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function IconDownload({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function IconRefresh({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}
function IconCheck({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

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

// ─── Globe ────────────────────────────────────────────────────────────────────

function GlobeViz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phi = useRef(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 480 * 2,
      height: 480 * 2,
      phi: 0,
      theta: 0.2,
      dark: 1,
      diffuse: 1.8,
      mapSamples: 20000,
      mapBrightness: 0.9,
      baseColor: [0.07, 0.12, 0.18],
      markerColor: [0.13, 0.77, 0.72],
      glowColor: [0.05, 0.3, 0.28],
      markers: [
        { location: [37.7595, -122.4367], size: 0.05 },
        { location: [40.7128, -74.006], size: 0.05 },
        { location: [51.5074, -0.1278], size: 0.04 },
        { location: [35.6762, 139.6503], size: 0.04 },
        { location: [22.3193, 114.1694], size: 0.05 },
        { location: [1.3521, 103.8198], size: 0.04 },
        { location: [31.2304, 121.4737], size: 0.05 },
        { location: [52.52, 13.405], size: 0.04 },
        { location: [48.8566, 2.3522], size: 0.04 },
        { location: [19.076, 72.8777], size: 0.04 },
        { location: [-33.8688, 151.2093], size: 0.04 },
        { location: [25.2048, 55.2708], size: 0.04 },
        { location: [-23.5505, -46.6333], size: 0.04 },
        { location: [55.7558, 37.6173], size: 0.03 },
      ],
    });

    let rafId: number;
    const animate = () => {
      phi.current += 0.0022;
      globe.update({ phi: phi.current });
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      globe.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 480, height: 480 }}
    />
  );
}

// ─── Floating Quote Card ──────────────────────────────────────────────────────

function FloatingCard({
  vendor, price, tag, tagColor = "text-teal-400", delay = 0, rotation = "-3deg",
  className = "",
}: {
  vendor: string; price: string; tag: string; tagColor?: string;
  delay?: number; rotation?: string; className?: string;
}) {
  return (
    <motion.div
      className={`absolute backdrop-blur-md rounded-xl border border-white/10 px-4 py-3 w-56 ${className}`}
      style={{
        background: "rgba(255,255,255,0.06)",
        rotate: rotation,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 3.5 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-white/90">{vendor}</span>
        <span className="text-[9px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded font-mono">QUOTE</span>
      </div>
      <div className="font-mono text-lg font-bold text-white">{price}</div>
      <div className={`text-[10px] mt-1.5 font-medium ${tagColor} flex items-center gap-1`}>
        {tag}
      </div>
    </motion.div>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode; title: string; description: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      className="bg-white border border-slate-200 rounded-xl p-5 transition-shadow duration-200 hover:shadow-md hover:shadow-slate-200"
    >
      <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center mb-3.5 text-teal-600">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </motion.div>
  );
}

// ─── Step ─────────────────────────────────────────────────────────────────────

function Step({ number, title, description, badge, isLast = false }: {
  number: string; title: string; description: string; badge?: string; isLast?: boolean;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <div ref={ref} className="relative flex gap-5">
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.1, type: "spring", stiffness: 300 }}
          className="w-9 h-9 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0 z-10"
        >
          {number}
        </motion.div>
        {!isLast && (
          <motion.div
            initial={{ height: 0 }}
            animate={inView ? { height: "100%" } : {}}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="w-px bg-teal-200 flex-1 mt-2"
          />
        )}
      </div>
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="pb-9"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {badge && (
            <span className="text-[9px] bg-teal-50 border border-teal-200 text-teal-700 px-1.5 py-0.5 rounded font-bold tracking-wider uppercase">
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 leading-relaxed max-w-sm">{description}</p>
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
        background: scrolled ? "rgba(8,12,24,0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(18px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.07)" : "none",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center">
            <span className="text-teal-400 text-[10px] font-bold">QP</span>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">QuotePilot</span>
        </div>

        <div className="hidden md:flex items-center gap-7">
          {[
            { label: "Features", href: "#features" },
            { label: "Intelligence", href: "#pipeline" },
            { label: "How it Works", href: "#how-it-works" },
            { label: "Demo", href: "#demo" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-white/55 hover:text-white transition-colors duration-150 font-medium"
            >
              {link.label}
            </a>
          ))}
        </div>

        <Link
          to="/"
          className="shimmer-btn inline-flex items-center gap-2 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-all duration-150 hover:shadow-lg hover:shadow-teal-500/25"
        >
          Open Dashboard
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </Link>
      </div>
    </motion.nav>
  );
}

// ─── Terminal lines (module-level to avoid StrictMode stale closure) ──────────

const TERMINAL_LINES = [
  "$ quotepilot run --rfq \"500 Custom Boxes\" --zip 10001",
  "  Dispatching 4 agents in parallel…",
  "  [Packlane]     STARTED   run_a3f8b2",
  "  [CustomBoxes]  STARTED   run_9c1d7e",
  "  [Packlane]     Navigating quote form…",
  "  [Packlane]     Quote extracted ✓   $0.87/unit",
  "  [CustomBoxes]  Quote extracted ✓   $0.92/unit",
  "  Pipeline › running shipping estimator…",
  "  [Packlane]     FedEx $34  ·  UPS $41  ·  landed $478 ✓",
  "  Pipeline › benchmarking vs. Alibaba market…",
  "  [Benchmark]    Avg $0.94/unit  ·  Packlane 7% below ★",
  "  Pipeline › trust scoring vendors…",
  "  [Trust]        Packlane BBB A+  ·  score 91/100 ✓",
];

// ─── Hero ─────────────────────────────────────────────────────────────────────

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
    }, 380);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="landing-hero relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6">
      {/* Aurora background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="animate-aurora-1 absolute -top-40 -left-40 w-[800px] h-[800px] rounded-full opacity-[0.14] blur-[100px]"
          style={{ background: "radial-gradient(circle at center, #0D9488, transparent 70%)" }} />
        <div className="animate-aurora-2 absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.11] blur-[80px]"
          style={{ background: "radial-gradient(circle at center, #2563EB, transparent 70%)" }} />
        <div className="animate-aurora-3 absolute top-1/2 right-1/3 w-[400px] h-[400px] rounded-full opacity-[0.08] blur-[80px]"
          style={{ background: "radial-gradient(circle at center, #0D9488, transparent 70%)" }} />
        <div className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }} />
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
              TinyFish Hackathon · AI Procurement Agent
            </motion.div>

            <motion.h1
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="text-[3.2rem] lg:text-[4.2rem] font-bold leading-[1.06] tracking-tight text-white mb-6"
            >
              {["Stop", "Emailing.", "Start Deploying", "Agents."].map((word, i) => (
                <motion.span key={i} variants={fadeUp} className="block">
                  {i === 3 ? (
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
              transition={{ delay: 0.55, duration: 0.6 }}
              className="text-white/55 text-base leading-relaxed mb-8 max-w-lg"
            >
              QuotePilot dispatches AI agents to fill quote forms across all your vendors simultaneously, then automatically estimates shipping costs, benchmarks against market prices, and scores vendor trust — all before you lift a finger.
            </motion.p>

            {/* Pipeline badge row */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.5 }}
              className="flex items-center gap-1.5 mb-8 flex-wrap"
            >
              {[
                { label: "Quote Agents", color: "text-teal-400" },
                { label: "Shipping AI", color: "text-blue-400" },
                { label: "Market Benchmark", color: "text-violet-400" },
                { label: "Trust Scoring", color: "text-green-400" },
              ].map((stage, i) => (
                <div key={stage.label} className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-semibold ${stage.color} px-2 py-1 rounded border border-white/10 bg-white/5`}>
                    {stage.label}
                  </span>
                  {i < 3 && <span className="text-white/20 text-xs">→</span>}
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.5 }}
              className="flex flex-wrap items-center gap-4"
            >
              <Link
                to="/"
                className="shimmer-btn inline-flex items-center gap-2.5 text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transition-shadow duration-200"
              >
                Open Dashboard
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-white/60 hover:text-white font-medium text-sm px-5 py-3.5 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-150"
              >
                See How It Works
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
                  <path d="M8 3v10M4 9l4 4 4-4" />
                </svg>
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="flex items-center gap-3 mt-8"
            >
              <div className="flex items-center gap-1.5">
                <IconCheck className="w-3.5 h-3.5 text-teal-500" />
                <span className="text-[11px] text-white/35 font-medium">Parallel dispatch</span>
              </div>
              <span className="text-white/15">·</span>
              <div className="flex items-center gap-1.5">
                <IconCheck className="w-3.5 h-3.5 text-teal-500" />
                <span className="text-[11px] text-white/35 font-medium">Auto-pipeline</span>
              </div>
              <span className="text-white/15">·</span>
              <div className="flex items-center gap-1.5">
                <IconCheck className="w-3.5 h-3.5 text-teal-500" />
                <span className="text-[11px] text-white/35 font-medium">Powered by TinyFish AI</span>
              </div>
            </motion.div>
          </div>

          {/* Right: Terminal */}
          <div className="relative hidden lg:block" style={{ height: "520px" }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="terminal rounded-2xl overflow-hidden border border-white/10 w-full"
              style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.025]">
                <span className="w-3 h-3 rounded-full bg-red-500/60" />
                <span className="w-3 h-3 rounded-full bg-amber-500/60" />
                <span className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="ml-4 text-[11px] text-slate-500 font-mono">agent.log — QuotePilot</span>
              </div>
              <div className="px-4 py-4 space-y-1.5 min-h-[280px] max-h-[360px] overflow-y-auto">
                <AnimatePresence>
                  {terminalLines.map((line, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.22 }}
                      className={`text-[11px] font-mono leading-relaxed ${
                        line?.includes("✓") ? "text-green-400" :
                        line?.includes("★") ? "text-amber-400" :
                        line?.includes("Pipeline") ? "text-blue-400" :
                        line?.includes("STARTED") ? "text-teal-400" :
                        line?.includes("$") && !line?.includes("/unit") ? "text-white" :
                        "text-slate-400"
                      }`}
                    >
                      {line}
                    </motion.p>
                  ))}
                </AnimatePresence>
                {terminalLines.length < TERMINAL_LINES.length && (
                  <span className="inline-block w-2 h-3.5 bg-teal-500/70 animate-pulse" />
                )}
              </div>
            </motion.div>

            {/* Floating cards */}
            <FloatingCard
              vendor="Packlane"
              price="$478 landed"
              tag="★ 7% below market · BBB A+"
              tagColor="text-teal-400"
              delay={0}
              rotation="-4deg"
              className="-bottom-4 -left-10"
            />
            <FloatingCard
              vendor="The Custom Boxes"
              price="$0.92/unit"
              tag="FedEx $38 · UPS $46"
              tagColor="text-blue-400"
              delay={0.9}
              rotation="3deg"
              className="-bottom-1 right-0"
            />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
      >
        <span className="text-[10px] text-white/25 font-medium tracking-widest uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-px h-8 bg-gradient-to-b from-white/25 to-transparent"
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
      icon: <svg className="w-7 h-7 text-red-500/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
      title: "Hours of email chains",
      description: "Writing individual emails to 5–15 vendors, waiting days for responses, chasing follow-ups. All for a single RFQ.",
    },
    {
      icon: <svg className="w-7 h-7 text-red-500/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>,
      title: "Manual spreadsheet hell",
      description: "Copy-pasting quotes into spreadsheets, reformatting prices, trying to compare apples to oranges across vendors.",
    },
    {
      icon: <svg className="w-7 h-7 text-red-500/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
      title: "No context to decide",
      description: "You get a price, but is it fair? You have no idea about shipping costs, market averages, or whether the vendor is trustworthy.",
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
          className="text-center mb-14"
        >
          <motion.p variants={fadeUp} className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">
            The Problem
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-slate-900 leading-tight">
            Procurement hasn't changed<br />in 20 years.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-slate-500 mt-4 max-w-lg mx-auto text-sm leading-relaxed">
            Getting competitive quotes still means dozens of browser tabs, copy-paste marathons, and decisions made without the full picture.
          </motion.p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid md:grid-cols-3 gap-5"
        >
          {pains.map((pain) => (
            <motion.div
              key={pain.title}
              variants={fadeUp}
              className="bg-white border border-slate-200 rounded-xl p-6"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
            >
              <div className="mb-4">{pain.icon}</div>
              <h3 className="font-semibold text-slate-800 mb-2 text-sm">{pain.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{pain.description}</p>
              <div className="mt-5 flex items-center gap-2">
                <div className="h-0.5 flex-1 bg-red-200 rounded" />
                <span className="text-[9px] text-red-400 font-semibold uppercase tracking-wider">time wasted</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Intelligence Pipeline Section ───────────────────────────────────────────

function PipelineSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const stages = [
    {
      icon: <IconZap className="w-5 h-5" />,
      label: "01  Quote Agents",
      title: "Parallel dispatch to every vendor",
      description: "One autonomous agent per vendor, all running simultaneously. Each agent navigates the quote form, fills in your specs, and extracts the price — no humans in the loop.",
      accent: "text-teal-400",
      bg: "bg-teal-500/10 border-teal-500/25",
    },
    {
      icon: <IconPackage className="w-5 h-5" />,
      label: "02  Shipping Estimator",
      title: "FedEx + UPS rates, auto-calculated",
      description: "After every quote comes in, QuotePilot auto-runs a shipping estimation agent. Provide a destination ZIP and package details — get real FedEx and UPS rates with a total landed cost.",
      accent: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/25",
    },
    {
      icon: <IconBarChart className="w-5 h-5" />,
      label: "03  Market Benchmark",
      title: "Is the price actually good?",
      description: "Once shipping is done, an Alibaba benchmark agent checks current market prices for your product. Each quote gets tagged: below market, at market, or above market — with the % difference.",
      accent: "text-violet-400",
      bg: "bg-violet-500/10 border-violet-500/25",
    },
    {
      icon: <IconShield className="w-5 h-5" />,
      label: "04  Trust Scoring",
      title: "BBB, Trustpilot, Google Maps",
      description: "Every vendor in your catalog gets a trust score composed from BBB rating, Trustpilot reviews, and Google Maps rating — auto-triggered when you add a vendor. Never guess on reputation again.",
      accent: "text-green-400",
      bg: "bg-green-500/10 border-green-500/25",
    },
  ];

  return (
    <section className="py-28 landing-hero relative overflow-hidden" id="pipeline">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="animate-aurora-1 absolute -top-20 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.09] blur-[100px]"
          style={{ background: "radial-gradient(circle, #0D9488, transparent 70%)" }} />
        <div className="animate-aurora-2 absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.07] blur-[80px]"
          style={{ background: "radial-gradient(circle, #2563EB, transparent 70%)" }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold text-teal-400 uppercase tracking-widest mb-3">Intelligence Layer</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-4">
            One RFQ. Four layers of intelligence.
          </h2>
          <p className="text-white/45 text-base max-w-xl mx-auto leading-relaxed">
            QuotePilot runs a complete automated pipeline — not just form filling. Every decision you make is backed by shipping data, market context, and vendor trust.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Pipeline stages */}
          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-[22px] top-8 bottom-8 w-px bg-white/5" />
            <motion.div
              className="absolute left-[22px] top-8 w-px bg-gradient-to-b from-teal-500 via-blue-500 via-violet-500 to-green-500"
              initial={{ height: 0 }}
              animate={inView ? { height: "calc(100% - 64px)" } : {}}
              transition={{ duration: 1.8, delay: 0.4, ease: "easeInOut" }}
            />

            <div className="space-y-2">
              {stages.map((stage, i) => (
                <motion.div
                  key={stage.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.15 }}
                  className="flex gap-5 items-start"
                >
                  {/* Dot */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={inView ? { scale: 1 } : {}}
                    transition={{ duration: 0.3, delay: 0.5 + i * 0.2, type: "spring", stiffness: 400 }}
                    className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 z-10 ${stage.bg} ${stage.accent}`}
                  >
                    {stage.icon}
                  </motion.div>

                  {/* Content */}
                  <div className="pb-8">
                    <div className={`text-[10px] font-mono font-bold uppercase tracking-wider mb-1 ${stage.accent}`}>
                      {stage.label}
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1.5">{stage.title}</h3>
                    <p className="text-xs text-white/40 leading-relaxed">{stage.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: Globe + vendor discovery */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col items-center relative"
          >
            <div className="relative">
              <GlobeViz />

              {/* Floating annotation cards */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-8 -right-4 backdrop-blur-md rounded-xl border border-white/10 px-3.5 py-2.5 w-48"
                style={{ background: "rgba(255,255,255,0.07)" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-md bg-teal-500/20 flex items-center justify-center">
                    <IconSearch className="w-3 h-3 text-teal-400" />
                  </div>
                  <span className="text-[10px] text-white/60 font-medium">Discovery</span>
                </div>
                <div className="text-xs font-semibold text-white">47 suppliers found</div>
                <div className="text-[10px] text-teal-400 mt-0.5">ThomasNet · Alibaba · Google</div>
              </motion.div>

              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute top-1/3 -left-8 backdrop-blur-md rounded-xl border border-white/10 px-3.5 py-2.5 w-44"
                style={{ background: "rgba(255,255,255,0.07)" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-md bg-green-500/20 flex items-center justify-center">
                    <IconShield className="w-3 h-3 text-green-400" />
                  </div>
                  <span className="text-[10px] text-white/60 font-medium">Trust Score</span>
                </div>
                <div className="text-xs font-semibold text-white">91 / 100</div>
                <div className="text-[10px] text-green-400 mt-0.5">BBB A+ · Google 4.8★</div>
              </motion.div>

              <motion.div
                animate={{ y: [0, -9, 0] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute -bottom-2 right-4 backdrop-blur-md rounded-xl border border-white/10 px-3.5 py-2.5 w-48"
                style={{ background: "rgba(255,255,255,0.07)" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-md bg-violet-500/20 flex items-center justify-center">
                    <IconBarChart className="w-3 h-3 text-violet-400" />
                  </div>
                  <span className="text-[10px] text-white/60 font-medium">Market Benchmark</span>
                </div>
                <div className="text-xs font-semibold text-white">7% below market</div>
                <div className="text-[10px] text-violet-400 mt-0.5">Avg $0.94 · yours $0.87</div>
              </motion.div>
            </div>

            <p className="text-xs text-white/25 font-mono mt-4 text-center">
              Global vendor network · real-time discovery
            </p>
          </motion.div>
        </div>
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
          <h2 className="text-3xl font-bold text-slate-900">From brief to best price,<br />fully automated.</h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <Step
              number="01"
              title="Create your RFQ in seconds"
              description="Describe your product — type, quantity, dimensions, material, color. Your contact info is pre-filled from your profile. Optionally add a destination ZIP to unlock shipping estimates."
            />
            <Step
              number="02"
              title="Pick your vendors"
              description="Select from your vendor catalog, or let QuotePilot discover new suppliers on ThomasNet, Google, or Alibaba — complete with online quote forms already mapped."
            />
            <Step
              number="03"
              title="Agents navigate every form"
              description="One autonomous agent per vendor runs simultaneously. Each one finds the quote form, fills it with your specs, submits it, and extracts the price — just like a human would, but in minutes."
            />
            <Step
              number="04"
              title="Pipeline runs automatically"
              description="The moment quotes come in, shipping estimation agents run in parallel (FedEx + UPS), followed by Alibaba market benchmarking. No extra clicks needed."
              badge="Auto"
            />
            <Step
              number="05"
              title="Compare, decide, award"
              description="A sortable table shows unit price, total landed cost, shipping, lead time, MOQ, and market position. One click awards the winner with a decision note."
              isLast
            />
          </div>

          {/* Live agent view */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.2 }}
            className="space-y-3"
          >
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Live Agent View</div>

            {/* Quote agents */}
            {[
              { vendor: "Packlane", status: "completed", price: "$0.87/unit", landed: "$478", extra: "bg-green-500" },
              { vendor: "The Custom Boxes", status: "completed", price: "$0.92/unit", landed: "$521", extra: "bg-green-500" },
              { vendor: "UPrinting", status: "shipping", price: "Estimating shipping…", landed: null, extra: "bg-blue-500" },
              { vendor: "VistaPrint", status: "queued", price: "Queued", landed: null, extra: "bg-slate-300" },
            ].map((v) => (
              <div key={v.vendor} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${v.extra} ${v.status === "shipping" ? "animate-pulse" : ""}`} />
                <span className="text-sm font-medium text-slate-700 flex-1">{v.vendor}</span>
                <div className="text-right">
                  <div className={`text-xs font-mono ${v.status === "completed" ? "text-teal-700 font-semibold" : "text-slate-400"}`}>
                    {v.price}
                  </div>
                  {v.landed && (
                    <div className="text-[10px] text-slate-400 font-mono">landed {v.landed}</div>
                  )}
                </div>
                {v.status === "completed" && (
                  <span className="text-[10px] bg-green-50 border border-green-200 text-green-700 px-1.5 py-0.5 rounded font-semibold ml-1">✓</span>
                )}
              </div>
            ))}

            {/* Pipeline indicator */}
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-3">Pipeline</div>
              <div className="flex items-center gap-2">
                {[
                  { label: "Quotes", done: true },
                  { label: "Shipping", active: true },
                  { label: "Benchmark", done: false },
                  { label: "Complete", done: false },
                ].map((stage, i) => (
                  <div key={stage.label} className="flex items-center gap-2">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${stage.done ? "bg-teal-500" : stage.active ? "bg-blue-500 animate-pulse" : "bg-slate-300"}`} />
                      <span className={`text-[9px] font-medium ${stage.done ? "text-teal-600" : stage.active ? "text-blue-600" : "text-slate-400"}`}>
                        {stage.label}
                      </span>
                    </div>
                    {i < 3 && <div className="w-6 h-px bg-slate-200 mb-3" />}
                  </div>
                ))}
              </div>
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
    { icon: <IconZap className="w-4 h-4" />, title: "Parallel dispatch", description: "All vendor agents run simultaneously — not one by one. Get all quotes in the time it takes to do one manually." },
    { icon: <IconTerminal className="w-4 h-4" />, title: "Real-time log stream", description: "Watch every agent step live via Socket.io. Every form field, every navigation, every result as it happens." },
    { icon: <IconPackage className="w-4 h-4" />, title: "Shipping estimator", description: "Auto-triggered FedEx + UPS rate comparison after every quote. Shows total landed cost alongside unit price." },
    { icon: <IconBarChart className="w-4 h-4" />, title: "Market benchmark", description: "Alibaba price comparison for each quote — know instantly if a vendor is below, at, or above market rate." },
    { icon: <IconShield className="w-4 h-4" />, title: "Trust scoring", description: "Composite vendor trust score from BBB rating, Trustpilot reviews, and Google Maps — auto-run on every vendor." },
    { icon: <IconSearch className="w-4 h-4" />, title: "Vendor discovery", description: "AI-powered supplier search on Google, ThomasNet, and Alibaba. Discovered vendors auto-map to online quote forms." },
    { icon: <IconTrophy className="w-4 h-4" />, title: "Award & audit trail", description: "Select a winning quote, add a decision note, mark the RFQ as awarded. Full procurement history logged." },
    { icon: <IconFile className="w-4 h-4" />, title: "RFQ templates", description: "Save any RFQ as a reusable template. One click to pre-fill specs for repeat product lines — profile pre-fills contact." },
    { icon: <IconDownload className="w-4 h-4" />, title: "CSV export", description: "Export the full quote comparison table to CSV — unit price, landed cost, shipping, lead time, market benchmark." },
    { icon: <IconRefresh className="w-4 h-4" />, title: "Re-run failed vendors", description: "If an agent fails on a vendor, re-run just those failures without losing your successful quotes or pipeline results." },
    { icon: <IconClock className="w-4 h-4" />, title: "45 min saved per vendor", description: "Manual quoting takes 45+ minutes per vendor. QuotePilot runs 8+ vendors simultaneously in under 10 minutes." },
    { icon: <IconGlobe className="w-4 h-4" />, title: "Multi-source discovery", description: "Google, ThomasNet, and Alibaba sources available. Accept a discovered vendor directly into your catalog." },
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
          <p className="text-slate-500 mt-3 max-w-md mx-auto text-sm leading-relaxed">
            No duct tape. No manual steps. A complete autonomous quoting workflow with intelligence at every stage.
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5"
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
    { value: 45, suffix: " min", label: "saved per vendor", sub: "vs. manual email outreach" },
    { value: 4, suffix: " stages", label: "automated pipeline", sub: "quotes → ship → bench → trust" },
    { value: 8, suffix: "×", label: "faster than email RFQ", sub: "parallel agent dispatch" },
    { value: 3, suffix: " sources", label: "vendor discovery", sub: "Google · ThomasNet · Alibaba" },
  ];

  return (
    <section className="py-24 landing-hero relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="animate-aurora-1 absolute top-0 left-1/4 w-[600px] h-[500px] rounded-full opacity-[0.07] blur-[90px]"
          style={{ background: "radial-gradient(circle, #0D9488, transparent 70%)" }} />
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
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {stats.map((s) => (
            <motion.div
              key={s.label}
              variants={fadeUp}
              className="text-center rounded-2xl border border-white/8 p-6"
              style={{ background: "rgba(255,255,255,0.035)" }}
            >
              <div className="text-4xl font-bold font-mono text-teal-400 leading-none mb-2">
                <CountUp to={s.value} suffix={s.suffix} />
              </div>
              <div className="text-sm font-semibold text-white/75 mb-1">{s.label}</div>
              <div className="text-[10px] text-white/25 font-mono">{s.sub}</div>
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
          <h2 className="text-3xl font-bold text-slate-900">Everything in one dashboard.</h2>
          <p className="text-slate-500 mt-3 max-w-md mx-auto text-sm">Quotes, shipping, benchmarks, trust scores — all surfaced in a clean, sortable table.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="grid md:grid-cols-3 gap-4"
        >
          {/* Panel 1: Quote comparison with landed cost */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Quote Comparison</span>
              <span className="text-[9px] text-teal-600 font-mono bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">Quotes tab</span>
            </div>
            <div className="p-4 space-y-2">
              {[
                { name: "Packlane", price: "$0.87", landed: "$478", market: "-7%", best: true },
                { name: "Custom Boxes", price: "$0.92", landed: "$521", market: "-2%", best: false },
                { name: "UPrinting", price: "$1.04", landed: "$598", market: "+10%", best: false },
              ].map((v) => (
                <div key={v.name} className={`rounded-lg border px-3 py-2.5 text-xs ${v.best ? "bg-teal-50 border-teal-200" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800">{v.name}</span>
                    {v.best && <span className="text-[9px] bg-teal-600 text-white px-1.5 py-0.5 rounded font-bold tracking-widest">BEST</span>}
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className={`font-bold ${v.best ? "text-teal-700" : "text-slate-600"}`}>{v.price}/unit</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 text-[10px]">landed {v.landed}</span>
                    <span className={`text-[10px] ml-auto font-semibold ${v.market.startsWith("-") ? "text-green-600" : "text-red-500"}`}>{v.market} mkt</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Panel 2: Agent terminal */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Agent Terminal</span>
              <span className="text-[9px] text-teal-600 font-mono bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">Activity tab</span>
            </div>
            <div className="p-3 rounded-lg text-[10px] space-y-1.5" style={{ background: "#0F172A" }}>
              {[
                { t: "12:04:01", type: "STARTED", icon: "⚡", v: "Packlane", msg: "Agent started", color: "text-teal-400" },
                { t: "12:04:09", type: "COMPLETE", icon: "✓", v: "Packlane", msg: "$0.87/unit extracted", color: "text-green-400" },
                { t: "12:04:10", type: "SHIP", icon: "📦", v: "Packlane", msg: "FedEx $34 · UPS $41", color: "text-blue-400" },
                { t: "12:04:22", type: "BENCH", icon: "★", v: "Market", msg: "7% below avg market", color: "text-amber-400" },
                { t: "12:04:25", type: "TRUST", icon: "🛡", v: "Packlane", msg: "BBB A+ · score 91", color: "text-green-400" },
              ].map((l, i) => (
                <div key={i} className="flex gap-1.5 font-mono">
                  <span className="text-slate-600 shrink-0">{l.t}</span>
                  <span className={`shrink-0 ${l.color}`}>[{l.type.slice(0, 5)}]</span>
                  <span className="text-slate-300 truncate">{l.msg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Panel 3: Trust + vendor card */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Vendor Trust</span>
              <span className="text-[9px] text-teal-600 font-mono bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">Vendors page</span>
            </div>
            <div className="p-4 space-y-3">
              {[
                { name: "Packlane", score: 91, bbb: "A+", tp: "4.6", g: "4.8", color: "text-green-600", bg: "bg-green-50 border-green-200" },
                { name: "Custom Boxes", score: 74, bbb: "A", tp: "4.1", g: "4.2", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
                { name: "UPrinting", score: 58, bbb: "B+", tp: "3.8", g: "3.9", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
              ].map((v) => (
                <div key={v.name} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-800">{v.name}</span>
                    <span className={`text-xs font-bold font-mono ${v.color} border px-1.5 py-0.5 rounded ${v.bg}`}>
                      ★ {v.score}
                    </span>
                  </div>
                  <div className="flex gap-2 text-[10px] font-mono text-slate-500">
                    <span>BBB {v.bbb}</span>
                    <span className="text-slate-300">·</span>
                    <span>Trustpilot {v.tp}</span>
                    <span className="text-slate-300">·</span>
                    <span>Google {v.g}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
        <div className="animate-aurora-2 absolute -top-20 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full opacity-[0.11] blur-[100px]"
          style={{ background: "radial-gradient(circle, #0D9488, transparent 70%)" }} />
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
          <motion.p variants={fadeUp} className="text-white/45 text-base mb-10 leading-relaxed">
            The full procurement intelligence stack — quote agents, shipping estimation, market benchmarking, trust scoring, vendor discovery — all automated, all in one dashboard.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/"
              className="shimmer-btn inline-flex items-center gap-3 text-white font-bold text-base px-8 py-4 rounded-xl shadow-xl shadow-teal-500/20 hover:shadow-teal-500/35 transition-shadow duration-200"
            >
              Open Dashboard
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 font-medium text-sm transition-colors"
            >
              See how it works
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
                <path d="M8 3v10M4 9l4 4 4-4" />
              </svg>
            </a>
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
          <span className="text-white/45 text-sm font-medium">QuotePilot</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="text-xs text-white/25 hover:text-white/55 transition-colors">Features</a>
          <a href="#pipeline" className="text-xs text-white/25 hover:text-white/55 transition-colors">Intelligence</a>
          <a href="#how-it-works" className="text-xs text-white/25 hover:text-white/55 transition-colors">How it Works</a>
          <Link to="/" className="text-xs text-teal-500 hover:text-teal-400 font-semibold transition-colors">Dashboard →</Link>
        </div>
        <p className="text-xs text-white/15 font-mono">
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
      <PipelineSection />
      <HowItWorksSection />
      <FeaturesSection />
      <DemoSection />
      <StatsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
