"use client";

import Link from "next/link";
import { ArrowRight, Building2, Stethoscope } from "lucide-react";
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
          <h1>What would you like to do?</h1>
          <p className="landing-simple-lede">
            Choose how you want to use Zola. You can sign in or create an account in the next step.
          </p>
        </div>

        <div className="landing-simple-actions">
          <Link href="/login?next=/home" className="button landing-cta">
            <Stethoscope size={17} />
            <span>Create a referral<small>For clinical staff coordinating patient care</small></span>
            <ArrowRight size={17} />
          </Link>
          <Link href="/workspace/login" className="button ghost landing-cta">
            <Building2 size={17} />
            <span>Manage a hospital<small>For hospital administrators and their teams</small></span>
            <ArrowRight size={17} />
          </Link>
        </div>

        <footer className="landing-simple-footer">
          <span>© {new Date().getFullYear()} Zola</span>
        </footer>
      </div>
    </main>
  );
}
