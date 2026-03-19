import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, QrCode, Users, CreditCard, Menu, ChevronDown, MessageCircle } from "lucide-react";
import optiflowLogo from "@/assets/optiflow-icon.png";

/* ── Intersection Observer hook ── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function FadeUp({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Landing page ── */
const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', 'DM Sans', sans-serif", scrollBehavior: "smooth" }}>
      {/* ━━ NAVBAR ━━ */}
      <nav
        className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(15,23,42,0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}
      >
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
          <span className="text-white text-[22px] tracking-tight" style={{ fontWeight: 800 }}>OptiFlow</span>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollTo("for-restaurants")} className="text-sm text-white/70 hover:text-white transition">For Restaurants</button>
            <button onClick={() => scrollTo("how-it-works")} className="text-sm text-white/70 hover:text-white transition">How it works</button>
            <button onClick={() => navigate("/login")} className="text-sm px-5 py-2 rounded-xl border border-white/30 text-white hover:bg-white/10 transition">Sign In</button>
            <button onClick={() => navigate("/signup")} className="text-sm px-5 py-2 rounded-xl bg-[#0FBCB0] text-white font-semibold hover:bg-[#0A9A90] transition">Get Started</button>
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden text-white" onClick={() => setMobileOpen(!mobileOpen)}>
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-[#0F172A]/95 backdrop-blur-xl border-t border-white/10 px-6 pb-6 flex flex-col gap-4">
            <button onClick={() => scrollTo("for-restaurants")} className="text-left text-white/80 py-2">For Restaurants</button>
            <button onClick={() => scrollTo("how-it-works")} className="text-left text-white/80 py-2">How it works</button>
            <button onClick={() => navigate("/login")} className="text-left text-white/80 py-2">Sign In</button>
            <button onClick={() => scrollTo("cta")} className="w-full py-3 rounded-xl bg-[#0FBCB0] text-white font-semibold">Get Started</button>
          </div>
        )}
      </nav>

      {/* ━━ HERO ━━ */}
      <section className="relative bg-[#0F172A] pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden">
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23fff' stroke-width='1'%3E%3Cpath d='M0 0h60v60'/%3E%3C/g%3E%3C/svg%3E\")" }} />

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <FadeUp>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#0FBCB0]/15 text-[#0FBCB0] border border-[#0FBCB0]/20 mb-8">
              ✦ Built for Kurdistan's restaurants
            </span>
          </FadeUp>

          <FadeUp delay={0.1}>
            <h1 className="text-4xl sm:text-5xl md:text-[64px] text-white leading-[1.1] mb-6" style={{ fontWeight: 800, letterSpacing: "-0.03em" }}>
              Stop losing customers<br />to long bill waits.
            </h1>
          </FadeUp>

          <FadeUp delay={0.2}>
            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed" style={{ fontWeight: 400 }}>
              OptiFlow gives every table a live digital receipt.
              Customers scan a QR code, split the bill, and pay
              in under 2 minutes — no app download needed.
            </p>
          </FadeUp>

          <FadeUp delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <button onClick={() => scrollTo("cta")} className="px-8 py-4 rounded-xl bg-[#0FBCB0] text-white text-base font-semibold hover:bg-[#0A9A90] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#0FBCB0]/20">
                Get Started Free
              </button>
              <button onClick={() => scrollTo("how-it-works")} className="px-8 py-4 rounded-xl border border-white/30 text-white text-base font-medium hover:bg-white/5 transition-all flex items-center gap-2">
                See How It Works <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </FadeUp>

          <FadeUp delay={0.4}>
            <p className="text-sm text-white/30 mb-16">
              Trusted by restaurants in Erbil · Garden Avenue · Derwaza Corniche
            </p>
          </FadeUp>

          {/* Phone mockup */}
          <FadeUp delay={0.5}>
            <div className="relative mx-auto w-[260px] sm:w-[280px]" style={{ animation: "float 6s ease-in-out infinite" }}>
              <div className="rounded-[36px] border-[6px] border-white/10 bg-[#1E293B] p-3 shadow-2xl shadow-black/40">
                <div className="rounded-[28px] bg-white overflow-hidden">
                  {/* Simplified bill mockup */}
                  <div className="p-5">
                    <div className="flex items-center justify-center mb-4">
                      <img src={optiflowLogo} alt="Logo" className="h-10 w-10 rounded-lg" />
                    </div>
                    <div className="text-center mb-4">
                      <div className="text-sm font-bold text-[#0F172A]">Garden Avenue</div>
                      <div className="text-[10px] text-[#64748B]">Table 5 · Live Bill</div>
                    </div>
                    <div className="space-y-2 mb-4">
                      {[["Grilled Chicken", "12,500"], ["Caesar Salad", "8,000"], ["Fresh Juice x2", "6,000"]].map(([n, p]) => (
                        <div key={n} className="flex justify-between text-[11px]">
                          <span className="text-[#374151]">{n}</span>
                          <span className="font-semibold text-[#0F172A]">{p} IQD</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-[#E2E8F0] pt-3 flex justify-between text-xs font-bold text-[#0F172A]">
                      <span>Total</span><span>26,500 IQD</span>
                    </div>
                    <div className="mt-4 py-2.5 rounded-lg bg-[#0FBCB0] text-white text-center text-xs font-semibold">
                      Pay Now
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ━━ THE PROBLEM ━━ */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <FadeUp>
              <div>
                <h2 className="text-3xl md:text-4xl text-[#0F172A] mb-4" style={{ fontWeight: 800, letterSpacing: "-0.03em" }}>
                  The bill process is broken.
                </h2>
                <p className="text-lg text-[#64748B] leading-relaxed">
                  Every restaurant in Kurdistan loses time and money
                  to the same broken checkout experience.
                </p>
              </div>
            </FadeUp>

            <FadeUp delay={0.15}>
              <div className="space-y-0">
                {[
                  { emoji: "🙋", step: "Customer asks for bill", time: "1 min" },
                  { emoji: "🚶", step: "Waiter goes to cashier", time: "3 min" },
                  { emoji: "🖨️", step: "Cashier prints receipt", time: "2 min" },
                  { emoji: "🚶", step: "Waiter returns", time: "3 min" },
                  { emoji: "🧮", step: "Group calculates split", time: "5 min" },
                  { emoji: "💸", step: "Waiter collects, goes back", time: "5 min" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-4 py-3 border-b border-[#F1F5F9] last:border-0">
                    <span className="text-lg w-8">{s.emoji}</span>
                    <div className="h-6 w-px bg-[#E2E8F0]" />
                    <span className="flex-1 text-sm text-[#374151]">{s.step}</span>
                    <span className="text-sm font-bold text-[#EF4444]/80 bg-[#FEF2F2] px-2.5 py-1 rounded-full">{s.time}</span>
                  </div>
                ))}

                <div className="pt-6 text-center">
                  <p className="text-xl font-bold text-[#EF4444]">Up to 30 minutes. Every. Single. Table.</p>
                  <p className="mt-2 text-lg font-bold text-[#0FBCB0]">With OptiFlow: under 2 minutes.</p>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ━━ HOW IT WORKS ━━ */}
      <section id="how-it-works" className="bg-[#F8FAFC] py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <FadeUp>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl text-[#0F172A] mb-3" style={{ fontWeight: 800, letterSpacing: "-0.03em" }}>
                How OptiFlow works
              </h2>
              <p className="text-lg text-[#64748B]">Three steps. Zero friction.</p>
            </div>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                num: "01", icon: <QrCode className="h-6 w-6" />, title: "Customer scans the table",
                body: "Every table has a QR code and NFC tag. One tap or scan opens the live receipt instantly — no app download needed.",
              },
              {
                num: "02", icon: <Users className="h-6 w-6" />, title: "Split the bill in seconds",
                body: "Each person picks their items, or splits equally. The math is done automatically. Tax divided fairly. No awkward calculations.",
              },
              {
                num: "03", icon: <CreditCard className="h-6 w-6" />, title: "Pay and go",
                body: "Pay with FIB Pay instantly or request cash. Digital receipt sent automatically. Table cleared faster for the next guests.",
              },
            ].map((c, i) => (
              <FadeUp key={i} delay={i * 0.12}>
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-start justify-between mb-6">
                    <span className="text-5xl font-extrabold text-[#0FBCB0]/15">{c.num}</span>
                    <div className="h-12 w-12 rounded-xl bg-[#0FBCB0]/10 flex items-center justify-center text-[#0FBCB0]">
                      {c.icon}
                    </div>
                  </div>
                  <h3 className="text-lg text-[#0F172A] mb-3" style={{ fontWeight: 700 }}>{c.title}</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">{c.body}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ WHY OPTIFLOW WINS ━━ */}
      <section className="bg-[#0F172A] py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <FadeUp>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl text-white mb-3" style={{ fontWeight: 800, letterSpacing: "-0.03em" }}>
                Built different. Built better.
              </h2>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">
                We didn't copy a western product and drop it in Kurdistan.
                We built OptiFlow from scratch for this market.
              </p>
            </div>
          </FadeUp>

          {/* Comparison table */}
          <FadeUp delay={0.1}>
            <div className="max-w-2xl mx-auto mb-16 rounded-2xl overflow-hidden border border-white/10">
              <div className="grid grid-cols-3 text-sm">
                {/* Header */}
                <div className="p-4 bg-white/5" />
                <div className="p-4 bg-white/5 text-center text-white/50 font-semibold">Others</div>
                <div className="p-4 bg-[#0FBCB0]/15 text-center text-[#0FBCB0] font-bold">OptiFlow</div>

                {[
                  "No app download", "Works with your POS", "FIB Pay built-in",
                  "Kurdish market focus", "Custom branding", "NFC + QR support",
                  "Bill splitting", "Works without internet",
                ].map((f, i) => (
                  <div key={i} className="contents">
                    <div className={`px-4 py-3 text-white/70 text-sm border-t border-white/5 ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>{f}</div>
                    <div className={`px-4 py-3 text-center border-t border-white/5 ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                      <X className="h-4 w-4 text-red-400/60 mx-auto" />
                    </div>
                    <div className={`px-4 py-3 text-center border-t border-white/5 bg-[#0FBCB0]/10`}>
                      <Check className="h-4 w-4 text-[#0FBCB0] mx-auto" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>

          {/* Feature cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Optimized for Kurdistan",
                body: "FIB Pay, IQD currency, Arabic and Kurdish support coming. Designed for how restaurants here actually work.",
              },
              {
                title: "Zero disruption to your POS",
                body: "We never touch your existing system. OptiFlow sits alongside it as a live receipt mirror layer.",
              },
              {
                title: "Your brand, your experience",
                body: "Every customer page looks like YOUR restaurant, not OptiFlow. Custom colors, logo, intro video.",
              },
            ].map((c, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-7 hover:bg-white/[0.08] transition-colors">
                  <h3 className="text-white text-lg mb-2" style={{ fontWeight: 700 }}>{c.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{c.body}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ FOR RESTAURANTS ━━ */}
      <section id="for-restaurants" className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <FadeUp>
              <div>
                <h2 className="text-3xl md:text-4xl text-[#0F172A] mb-4" style={{ fontWeight: 800, letterSpacing: "-0.03em" }}>
                  A dashboard that gives you full control
                </h2>
                <p className="text-lg text-[#64748B] mb-8 leading-relaxed">
                  Manage your menu, tables, and live bills in one place.
                  Watch payments come in from any device.
                  Set up your branding in minutes.
                </p>
                <ul className="space-y-3">
                  {[
                    "Live bill management for every table",
                    "Full menu management with photos",
                    "Custom branding and theme",
                    "QR + NFC code generation",
                    "Real-time payment tracking",
                    "Analytics and insights",
                  ].map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-[#374151]">
                      <div className="h-5 w-5 rounded-full bg-[#0FBCB0]/10 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-[#0FBCB0]" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeUp>

            <FadeUp delay={0.2}>
              <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 shadow-lg">
                {/* Dashboard mockup */}
                <div className="rounded-xl bg-white border border-[#E2E8F0] overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F1F5F9]">
                    <div className="h-3 w-3 rounded-full bg-[#EF4444]/40" />
                    <div className="h-3 w-3 rounded-full bg-[#F59E0B]/40" />
                    <div className="h-3 w-3 rounded-full bg-[#10B981]/40" />
                    <span className="ml-2 text-[10px] text-[#94A3B8]">OptiFlow Dashboard</span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[["Tables", "12"], ["Open Bills", "5"], ["Revenue", "1.2M"]].map(([l, v]) => (
                        <div key={l} className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-3 text-center">
                          <div className="text-[10px] text-[#94A3B8] uppercase tracking-wider mb-1">{l}</div>
                          <div className="text-lg font-extrabold text-[#0F172A]">{v}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {[
                        { t: "Table 3", s: "Open", c: "#10B981" },
                        { t: "Table 7", s: "Paid", c: "#2563EB" },
                        { t: "Table 1", s: "Pending", c: "#D97706" },
                      ].map((r) => (
                        <div key={r.t} className="flex items-center justify-between rounded-lg bg-[#F8FAFC] px-3 py-2">
                          <span className="text-xs font-semibold text-[#374151]">{r.t}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: r.c, background: `${r.c}15` }}>{r.s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ━━ STATS ━━ */}
      <section className="bg-[#0FBCB0] py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { stat: "30 → 2 min", label: "Bill settlement time" },
              { stat: "0 apps", label: "Customer downloads" },
              { stat: "100%", label: "Table coverage" },
            ].map((s, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div>
                  <div className="text-2xl sm:text-4xl md:text-5xl text-white mb-2" style={{ fontWeight: 800, letterSpacing: "-0.03em" }}>{s.stat}</div>
                  <div className="text-sm text-white/70">{s.label}</div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ CTA ━━ */}
      <section id="cta" className="bg-[#0F172A] py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <FadeUp>
            <h2 className="text-3xl md:text-4xl text-white mb-4" style={{ fontWeight: 800, letterSpacing: "-0.03em" }}>
              Ready to optimize your restaurant's flow?
            </h2>
          </FadeUp>
          <FadeUp delay={0.1}>
            <p className="text-lg text-white/50 mb-10">
              Join the restaurants in Erbil already using OptiFlow.
            </p>
          </FadeUp>
          <FadeUp delay={0.2}>
            <button onClick={() => navigate("/login")} className="px-10 py-4 rounded-xl bg-[#0FBCB0] text-white text-lg font-semibold hover:bg-[#0A9A90] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#0FBCB0]/25 mb-6">
              Get Started Today
            </button>
            <p className="text-sm text-white/40 flex items-center justify-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Questions? Contact us on WhatsApp
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ━━ FOOTER ━━ */}
      <footer className="bg-[#0B1120] py-12 border-t border-white/5">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid md:grid-cols-3 gap-10 items-start mb-10">
            <div>
              <span className="text-white text-xl" style={{ fontWeight: 800 }}>OptiFlow</span>
              <p className="text-sm text-white/40 mt-2">Optimizing the flow of your restaurant.</p>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-white/50 md:justify-center">
              <button onClick={() => scrollTo("hero")} className="hover:text-white transition">Home</button>
              <button onClick={() => scrollTo("how-it-works")} className="hover:text-white transition">How it works</button>
              <button onClick={() => scrollTo("for-restaurants")} className="hover:text-white transition">For Restaurants</button>
              <button onClick={() => navigate("/login")} className="hover:text-white transition">Sign In</button>
            </div>
            <div className="flex gap-4 md:justify-end">
              <a href="#" className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition" aria-label="Instagram">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C16.67.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
              </a>
              <a href="#" className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition" aria-label="WhatsApp">
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 text-center text-xs text-white/30">
            © 2026 OptiFlow. Built in Kurdistan.
          </div>
        </div>
      </footer>

      {/* Float animation keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
