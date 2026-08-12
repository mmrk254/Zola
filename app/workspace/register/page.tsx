"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { HospitalAuthLayout } from "@/components/hospital-auth-layout";

export default function WorkspaceRegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    hospital_name: "",
    admin_name: "",
    admin_email: "",
    phone: "",
    hospital_type: "referring",
    password: "",
    confirm_password: ""
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/hospitals/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not register hospital");
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <HospitalAuthLayout title="Hospital registered" subtitle="Your administrator account is ready." variant="register">
        <div className="auth-success">
          <CheckCircle2 size={40} />
          <p>
            <b>{form.hospital_name}</b> is on the network. Sign in with <b>{form.admin_email}</b> and the password you
            just created.
          </p>
          <Link href="/workspace/login" className="button auth-submit">
            Sign in to hospital dashboard
          </Link>
        </div>
      </HospitalAuthLayout>
    );
  }

  return (
    <HospitalAuthLayout
      title="Register a hospital"
      subtitle="Create your facility and administrator account on the Zola network."
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

        <label className="auth-field">
          <span>Admin password</span>
          <div className="auth-password">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Minimum 8 characters"
            />
            <button type="button" className="auth-eye" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <label className="auth-field">
          <span>Confirm password</span>
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            value={form.confirm_password}
            onChange={(e) => setForm((f) => ({ ...f, confirm_password: e.target.value }))}
            placeholder="Repeat password"
          />
        </label>

        <button type="submit" disabled={loading} className="button auth-submit">
          {loading ? "Creating account..." : "Create hospital account"}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>

      <p className="auth-footnote">
        Already registered? <Link href="/workspace/login">Sign in to your hospital dashboard</Link>
      </p>
    </HospitalAuthLayout>
  );
}
