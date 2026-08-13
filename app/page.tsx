"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, Ambulance, ArrowRight, Building2, Check, ChevronRight, ClipboardCheck, LockKeyhole, Menu, ShieldCheck, Stethoscope, UserRoundCheck, X } from "lucide-react";
import { ZolaLogo } from "@/components/zola-logo";

const referralStates = [
  { label: "Finding a suitable bed", className: "searching" },
  { label: "Hospital accepted", className: "accepted" },
  { label: "Family confirmation", className: "confirmed" },
  { label: "Ambulance arranged", className: "ambulance" },
  { label: "Patient received", className: "received" }
];

export default function Home() {
  const [stateIndex, setStateIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(
      () => setStateIndex((current) => (current + 1) % referralStates.length),
      2600
    );
    return () => window.clearInterval(interval);
  }, []);

  const state = referralStates[stateIndex];

  return (
    <main className="marketing">
      <nav className={`marketing-nav ${menuOpen ? "menu-open" : ""}`}>
        <Link href="/" className="brand" aria-label="Zola home">
          <ZolaLogo size={20} />
        </Link>
        <button
          type="button"
          className="icon-button marketing-menu-btn"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="marketing-links">
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
          <a href="#why-zola" onClick={() => setMenuOpen(false)}>Why Zola</a>
          <a href="#security" onClick={() => setMenuOpen(false)}>Built for trust</a>
          <Link href="/workspace" className="button ghost nav-button mobile-nav-cta" onClick={() => setMenuOpen(false)}>
            Open workspace <ArrowRight size={15} />
          </Link>
        </div>
        <Link href="/workspace" className="button ghost nav-button desktop-nav-cta">Open workspace <ArrowRight size={15} /></Link>
      </nav>

      <section className="marketing-hero">
        <div className="hero-copy-block">
          <p className="marketing-eyebrow"><span className="live-dot" /> Critical care coordination <span>·</span> Kenya</p>
          <h1>The bed was there.<br />No one could see it <i>in time</i>.</h1>
          <p className="marketing-lede">No Bed Syndrome is not just a shortage. It is a coordination failure. Zola gives care teams one secure pathway to find the right ICU, HDU, or NICU bed when minutes matter.</p>
          <div className="marketing-actions">
            <Link href="/login?next=/referrals/new" className="button">Create a referral <ArrowRight size={17} /></Link>
            <a href="#how-it-works" className="marketing-text-link">See how a referral moves <ChevronRight size={17} /></a>
          </div>
          <div className="trust-row"><span><ShieldCheck size={16} /> Clinical workflow</span><span><LockKeyhole size={16} /> Privacy by design</span></div>
        </div>

        <div className="referral-stage" aria-label={`Referral status: ${state.label}`}>
          <div className="stage-topline"><span className="mono">LIVE REFERRAL PATHWAY</span><span className={`stage-status ${state.className}`}><span />{state.label}</span></div>
          <div className="stage-case"><span className="case-icon"><Stethoscope size={18} /></span><div><small>NEW CRITICAL CARE REQUEST</small><strong className="mono">ZL-28491</strong></div><span className="critical-label">Critical</span></div>
          <div className="network-map">
            <svg viewBox="0 0 570 310" preserveAspectRatio="none" aria-hidden="true">
              <path d="M92 74 C230 74 266 147 406 147" /><path d="M92 236 C224 236 272 158 406 147" />
              <path className="route-active" d="M92 74 C230 74 266 147 406 147" />
              <circle className="svg-packet packet-teal" r="6"><animateMotion dur="3s" repeatCount="indefinite" path="M92 74 C230 74 266 147 406 147" /></circle>
              <circle className="svg-packet packet-blue" r="6" opacity="0">
                <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.97;1" dur="3s" begin="3.12s" repeatCount="indefinite" />
                <animateMotion dur="3s" begin="3.12s" repeatCount="indefinite" path="M92 236 C224 236 272 158 406 147" />
              </circle>
            </svg>
            <div className="hospital-node source one"><span><Building2 size={17} /></span><b>Kijani County</b><small>Referring facility</small></div>
            <div className="hospital-node source two"><span><Building2 size={17} /></span><b>Riverside Medical</b><small>Network facility</small></div>
            <div className="hospital-node destination"><span><Activity size={20} /></span><b>Nairobi Central</b><small><i /> ICU bed available</small></div>
          </div>
          <div className="stage-footer"><span><LockKeyhole size={13} /> Identifiers stay protected until acceptance</span><span className="mono">03:18</span></div>
        </div>
      </section>

      <section className="signal-strip" aria-label="Zola benefits"><div><Activity /><p><strong>One live pathway</strong><span>From referral to handover</span></p></div><div><Building2 /><p><strong>Network visibility</strong><span>Across participating hospitals</span></p></div><div><ClipboardCheck /><p><strong>Every action recorded</strong><span>Ready for clinical review</span></p></div></section>

      <section className="marketing-section journey" id="how-it-works">
        <div className="section-kicker">A predictable, safer handover</div>
        <div className="section-heading"><h2>A referral should move like care, not a chain of missed calls.</h2><p>Zola creates a shared, accountable route from the first clinical decision to a confirmed receiving team.</p></div>
        <div className="journey-grid">
          {[['01', 'Initiate', 'Capture the essential patient details, required care level, and urgency.'], ['02', 'Confirm consent', 'Record next-of-kin awareness before protected clinical details are shared.'], ['03', 'Match & accept', 'Suitable facilities see the request and accept with a visible timestamp.'], ['04', 'Transfer with clarity', 'Coordinate transport and close the loop when the patient arrives.']].map(([number, title, text]) => <article className="journey-step" key={number}><span className="mono">{number}</span><div className="step-mark"><Check size={15} /></div><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="marketing-section value-section" id="why-zola">
        <div className="value-panel"><div><div className="section-kicker light">Built around real responsibility</div><h2>Every handover is visible. Every decision has an owner.</h2><p>Replace fragmented calls, paper notes, and uncertainty with a workflow that gives every care team the same trusted picture.</p><Link href="/workspace" className="light-link">Open the workspace <ArrowRight size={16} /></Link></div><div className="audit-card"><div className="audit-title"><span><UserRoundCheck size={16} /> Referral activity</span><small className="mono">AUDIT TRAIL</small></div><div className="audit-event"><i className="event-teal" /><div><b>Bed accepted</b><span>Nairobi Central Hospital · Grace N.</span></div><time>10:42</time></div><div className="audit-event"><i className="event-blue" /><div><b>Family confirmation recorded</b><span>Kijani County Hospital · Dr. Otieno</span></div><time>10:48</time></div><div className="audit-event"><i className="event-green" /><div><b>Ambulance dispatched</b><span>Regional transport desk</span></div><time>11:02</time></div></div></div>
      </section>

      <section className="marketing-section security-section" id="security">
        <div className="section-heading compact"><div className="section-kicker">Designed for clinical trust</div><h2>Coordination without compromising care or confidentiality.</h2></div>
        <div className="security-grid"><article><span><ShieldCheck /></span><h3>Privacy-aware sharing</h3><p>Only the right information is visible at each point in the referral pathway.</p></article><article><span><UserRoundCheck /></span><h3>Clear responsibility</h3><p>Each action is tied to the person and hospital that made it.</p></article><article><span><Ambulance /></span><h3>Fewer blind transfers</h3><p>Receiving teams can respond with the context they need to prepare.</p></article></div>
      </section>

      <footer className="marketing-footer"><Link href="/" className="brand"><ZolaLogo size={18} /></Link><p>Critical care coordination for Kenya&apos;s hospital network.</p><span>© {new Date().getFullYear()} Zola</span></footer>
    </main>
  );
}
