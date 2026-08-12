"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    hospital_name: "",
    admin_name: "",
    admin_email: "",
    phone: "",
    hospital_type: "referring"
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/hospitals/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit application");
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <AuthLayout title="Application received" subtitle="Your hospital registration is with the platform team." variant="register">
        <div className="auth-success">
          <CheckCircle2 size={40} />
          <p>
            We received your request for <b>{form.hospital_name}</b>. A network administrator will review it and contact{" "}
            <b>{form.admin_email}</b> with next steps.
          </p>
          <Link href="/workspace" className="button auth-submit">
            Back to workspace
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Register a hospital"
      subtitle="Request access to the Zola referral network. No self-service activation until approved."
      variant="register"
    >
      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <label className="auth-field">
          <span>Hospital name</span>
          <input
            required
            value={form.hospital_name}
            onChange={(e) => setForm((f) => ({ ...f, hospital_name: e.target.value }))}
            placeholder="e.g. Kijani County Hospital"
          />
        </label>

        <label className="auth-field">
          <span>Facility type</span>
          <select value={form.hospital_type} onChange={(e) => setForm((f) => ({ ...f, hospital_type: e.target.value }))}>
            <option value="referring">Referring hospital</option>
            <option value="receiving">Receiving hospital</option>
            <option value="both">Both referring and receiving</option>
          </select>
        </label>

        <label className="auth-field">
          <span>Administrator full name</span>
          <input
            required
            value={form.admin_name}
            onChange={(e) => setForm((f) => ({ ...f, admin_name: e.target.value }))}
            placeholder="Primary contact at the facility"
          />
        </label>

        <label className="auth-field">
          <span>Administrator email</span>
          <input
            type="email"
            required
            value={form.admin_email}
            onChange={(e) => setForm((f) => ({ ...f, admin_email: e.target.value }))}
            placeholder="admin@hospital.org"
          />
        </label>

        <label className="auth-field">
          <span>Contact phone</span>
          <input
            required
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+254..."
          />
        </label>

        <button type="submit" disabled={loading} className="button auth-submit">
          {loading ? "Submitting..." : "Submit application"}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>

      <p className="auth-footnote">
        Already approved? <Link href="/login">Sign in to your workspace</Link>
      </p>
    </AuthLayout>
  );
}
