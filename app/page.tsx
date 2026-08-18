"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ZolaLogo } from "@/components/zola-logo";

export default function Home() {
  return (
    <main className="landing-simple">
      <div className="landing-simple-inner">
        <Link href="/" className="brand" aria-label="Zola home">
          <ZolaLogo size={24} />
        </Link>

        <div className="landing-simple-hero">
          <p className="marketing-eyebrow">
            <span className="live-dot" /> Critical care coordination · Kenya
          </p>
          <h1>Find the right bed, in time.</h1>
          <p className="landing-simple-lede">
            Zola connects care teams to ICU, HDU, and NICU beds across Kenya&apos;s hospital network.
          </p>
        </div>

        <div className="landing-simple-actions">
          <Link href="/login?next=/home" className="button landing-cta">
            Create a referral <ArrowRight size={17} />
          </Link>
          <Link href="/workspace" className="button ghost landing-cta">
            Open workspace <ArrowRight size={17} />
          </Link>
        </div>

        <footer className="landing-simple-footer">
          <span>© {new Date().getFullYear()} Zola</span>
        </footer>
      </div>
    </main>
  );
}
