"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdmin } from "@/lib/store";
import type { Role } from "@/lib/admin-types";
import { cn } from "@/lib/format";
import { Button, Field } from "@/components/ui";
import { Icon } from "@/components/Icon";

const demo: Record<Role, { name: string; email: string }> = {
  OWNER: { name: "Sithuliya Jayawardena", email: "owner@sithuliyaflora.lk" },
  FLORIST: { name: "Hansi Wickramasinghe", email: "hansi@sithuliyaflora.lk" },
  RIDER: { name: "Chamara Bandara", email: "chamara@sithuliyaflora.lk" },
};

/** Staff login with mandatory 2FA for owners (FR-AUTH-02.1 / 02.2). */
export default function AdminLoginPage() {
  const router = useRouter();
  const { signIn, session, hydrated } = useAdmin();
  const [role, setRole] = useState<Role>("OWNER");
  const [email, setEmail] = useState(demo.OWNER.email);
  const [pw, setPw] = useState("");
  const [step, setStep] = useState<"creds" | "2fa">("creds");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [fails, setFails] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hydrated && session) router.replace(session.role === "RIDER" ? "/rider" : "/");
  }, [hydrated, session, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fails >= 5) return;
    if (pw.length < 8) {
      const n = fails + 1;
      setFails(n);
      setErr(n >= 5 ? "Account locked for 15 minutes after 5 failed attempts. The owner has been alerted." : `Incorrect email or password (${5 - n} attempts left).`);
      return;
    }
    setErr("");
    setBusy(true);
    await new Promise((r) => setTimeout(r, 500));
    setBusy(false);
    if (role === "RIDER") {
      signIn({ name: demo.RIDER.name, email, role });
      router.push("/rider");
    } else setStep("2fa");
  };

  const verify = () => {
    if (!/^\d{6}$/.test(code)) return setErr("Enter the 6-digit code from your authenticator app.");
    signIn({ name: demo[role].name, email, role });
    router.push("/");
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-[#1b1714] lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://images.unsplash.com/photo-1530488228536-37ae1dbb20a4?auto=format&fit=crop&w=1400&q=80" alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1b1714] via-[#1b1714]/30 to-transparent" />
        <div className="absolute left-12 top-12 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark-white.png" alt="" className="h-10" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-word-white.png" alt="Sithuliya Flora" className="h-7" />
        </div>
        <div className="absolute bottom-12 left-12 right-12 text-[#fbf8f3]">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#f3adbd]">Studio portal</p>
          <p className="mt-3 max-w-md font-serif text-5xl leading-tight">Every order, slip and stem — in one calm place.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-mark.png" alt="" className="h-9" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-word.png" alt="Sithuliya Flora" className="h-6" />
          </div>
          {step === "creds" ? (
            <>
              <h1 className="font-serif text-4xl">Staff sign in</h1>
              <p className="mt-2 text-sm text-muted">Customer accounts can&apos;t sign in here.</p>
              <div className="mt-6 grid grid-cols-3 gap-1 rounded-full bg-panel-2 p-1 text-sm">
                {(["OWNER", "FLORIST", "RIDER"] as Role[]).map((r) => (
                  <button key={r} type="button" onClick={() => { setRole(r); setEmail(demo[r].email); setErr(""); }} className={cn("rounded-full py-1.5 capitalize transition", role === r ? "bg-panel font-medium shadow-sm" : "text-muted")}>
                    {r.toLowerCase()}
                  </button>
                ))}
              </div>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <Field label="Email"><input className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></Field>
                <Field label="Password" hint="Demo: any 8+ characters"><input className="field" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></Field>
                {err && <p className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"><Icon name="alert" size={16} className="mt-0.5 shrink-0" />{err}</p>}
                <Button className="w-full" disabled={busy || fails >= 5}>{busy ? "Checking…" : "Continue"}</Button>
              </form>
            </>
          ) : (
            <>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent-fg"><Icon name="shield" size={24} /></span>
              <h1 className="mt-5 font-serif text-4xl">Two-step verification</h1>
              <p className="mt-2 text-sm text-muted">Enter the 6-digit code from your authenticator app. This step is required for the owner account.</p>
              <input
                autoFocus
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setErr(""); }}
                className="field mt-6 h-14 text-center font-mono text-2xl tracking-[0.6em]"
                placeholder="••••••"
                aria-label="Authentication code"
              />
              {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
              <Button className="mt-4 w-full" onClick={verify}>Verify & sign in</Button>
              <button onClick={() => setStep("creds")} className="mt-3 w-full text-center text-sm text-muted hover:text-fg">Use a different account</button>
              <p className="mt-6 text-center text-xs text-faint">Lost your device? Use an SMS code instead · Demo: any 6 digits</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
