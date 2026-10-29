"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  User,
  Mail,
  Lock,
  Phone,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
      } else {
        router.push(data.redirectTo || "/explore");
      }
    } catch {
      setError("Network error while creating account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-blush-light text-ink p-4 sm:p-6">
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold text-xl text-ink"
        >
          <span className="w-9 h-9 rounded-btn bg-brand-pink text-surface-white flex items-center justify-center font-bold text-lg">
            V
          </span>
          <span>Vira</span>
        </Link>
        <Link
          href="/login"
          className="vira-btn-secondary px-4 py-2 text-xs sm:text-sm font-bold"
        >
          Sign In
        </Link>
      </header>

      <main className="max-w-md w-full mx-auto my-8 space-y-6">
        <div className="vira-card p-6 sm:p-8 space-y-6">
          <div className="space-y-2 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blush-deep text-xs font-bold text-brand-pink border border-border-rose">
              <ShieldCheck className="w-3.5 h-3.5" />
              Zero Location Data Sold
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">
              Create Your Vira Account
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted">
              Set up predictive route planning, your consent-based Trusted
              Circle, and SHA-256 Evidence Vault.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-btn bg-blush-deep border border-danger-red text-xs font-bold text-danger-red"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="reg-name"
                className="block text-xs font-bold text-ink mb-1.5"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-ink-muted absolute left-3 top-3" />
                <input
                  id="reg-name"
                  type="text"
                  required
                  placeholder="e.g. Kavya Nair"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-btn border border-border-rose bg-surface-white text-sm text-ink"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="block text-xs font-bold text-ink mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-3" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  placeholder="kavya@example.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-btn border border-border-rose bg-surface-white text-sm text-ink"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-phone"
                className="block text-xs font-bold text-ink mb-1.5"
              >
                Emergency Contact Phone (Optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-ink-muted absolute left-3 top-3" />
                <input
                  id="reg-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-btn border border-border-rose bg-surface-white text-sm text-ink"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-password"
                className="block text-xs font-bold text-ink mb-1.5"
              >
                Password (minimum 6 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-ink-muted absolute left-3 top-3" />
                <input
                  id="reg-password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-btn border border-border-rose bg-surface-white text-sm text-ink"
                />
              </div>
            </div>

            <div className="p-3 rounded-card bg-blush-light border border-border-rose space-y-1.5 text-xs text-ink-muted">
              <div className="flex items-center gap-2 font-bold text-ink">
                <CheckCircle2 className="w-4 h-4 text-brand-pink shrink-0" />
                <span>Privacy Guarantee Enabled by Default</span>
              </div>
              <p>
                Anonymous community reviews, 24-hour auto-deletion of trip
                history, and zero third-party location tracking.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="vira-btn-primary w-full py-3 px-4 flex items-center justify-center gap-2 text-base font-bold"
            >
              <span>
                {loading ? "Creating Account..." : "Create Free Account"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-3 border-t border-border-rose text-center text-xs text-ink-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-brand-pink underline">
              Sign in here
            </Link>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-ink-muted py-2">
        Vira complements, and does not replace, emergency services. In an
        emergency call 112.
      </footer>
    </div>
  );
}
