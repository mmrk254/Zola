import Link from "next/link";
import { Activity, ArrowRight, Baby, Building2, HeartPulse } from "lucide-react";
import { ZolaLogo } from "@/components/zola-logo";
import type { CareLevel } from "@/lib/types";

const NEEDS: { level: CareLevel; description: string; icon: typeof Activity }[] = [
  { level: "ICU", description: "Intensive care unit", icon: Activity },
  { level: "NICU", description: "Neonatal intensive care", icon: Baby },
  { level: "HDU", description: "High dependency unit", icon: HeartPulse },
];

export default function Home() {
  return (
    <main className="landing-simple">
      <div className="landing-simple-inner">
        <Link href="/" className="brand" aria-label="Zola home">
          <ZolaLogo size={24} />
        </Link>

        <div className="landing-simple-hero">
          <p className="marketing-eyebrow"><span className="live-dot" /> Critical care coordination · Kenya</p>
          <h1>What do you need?</h1>
          <p className="landing-simple-lede">Choose the care level. Next, tell us where the patient is and we’ll find nearby hospitals with an open bed.</p>
        </div>

        <div className="landing-simple-actions">
          {NEEDS.map(({ level, description, icon: Icon }) => (
            <Link key={level} href={`/home?care_level=${level}`} className="button landing-cta">
              <Icon size={19} />
              <span>{level}<small>{description}</small></span>
              <ArrowRight size={17} />
            </Link>
          ))}
        </div>

        <footer className="landing-simple-footer landing-entry-footer">
          <span>© {new Date().getFullYear()} Zola</span>
          <Link href="/workspace/login"><Building2 size={14} /> Hospital workspace</Link>
        </footer>
      </div>
    </main>
  );
}
