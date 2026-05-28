import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { getSupabaseRuntimeInfo, supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/supabase-test")({
  head: () => ({
    meta: [
      { title: "Temporary Supabase Connection Test | Vibemalayali" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/supabase-test` }],
  }),
  component: SupabaseTestPage,
});

type TestStatus = "idle" | "running" | "success" | "error";

type TestResult = {
  name: string;
  status: TestStatus;
  detail: string;
};

const EXPECTED_SUPABASE_URL = "https://xbavdrghclvmgbaltqiv.supabase.co";

function safeProjectUrl() {
  const url = getSupabaseRuntimeInfo().url || "Not configured";
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
}

function SupabaseTestPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const projectUrl = useMemo(() => safeProjectUrl(), []);
  const connected = results.length > 0 && results.every((item) => item.status === "success");

  useEffect(() => {
    runTests();
  }, []);

  async function runTests() {
    setRunning(true);
    const next: TestResult[] = [];

    const runtime = getSupabaseRuntimeInfo();
    const envOk = projectUrl !== "Not configured" && runtime.hasKey;
    next.push({
      name: "Environment variables",
      status: envOk ? "success" : "error",
      detail: envOk
        ? `Supabase URL and publishable/anon key are available. Key is hidden. Client created: ${runtime.clientCreated ? "yes" : "not yet"}.`
        : "Missing VITE_SUPABASE_URL/SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY/VITE_SUPABASE_ANON_KEY/SUPABASE_PUBLISHABLE_KEY/SUPABASE_ANON_KEY.",
    });

    next.push({
      name: "Expected project",
      status: projectUrl === EXPECTED_SUPABASE_URL ? "success" : "error",
      detail:
        projectUrl === EXPECTED_SUPABASE_URL
          ? `Live app is pointed at expected project: ${EXPECTED_SUPABASE_URL}`
          : `Live app is pointed at ${projectUrl}. Expected ${EXPECTED_SUPABASE_URL}.`,
    });
    setResults([...next]);

    try {
      const { data, error } = await supabase.auth.getSession();
      next.push({
        name: "Auth connection",
        status: error ? "error" : "success",
        detail: error
          ? error.message
          : data.session?.user
            ? `Auth reachable. Signed in as ${data.session.user.email ?? data.session.user.id}.`
            : "Auth reachable. No active signed-in session.",
      });
    } catch (error) {
      next.push({
        name: "Auth connection",
        status: "error",
        detail: error instanceof Error ? error.message : "Unknown auth error",
      });
    }
    setResults([...next]);

    try {
      const { data, error, count } = await (supabase as any)
        .from("profiles")
        .select("id", { count: "exact" })
        .limit(1);

      next.push({
        name: "Database query",
        status: error ? "error" : "success",
        detail: error
          ? error.message
          : `Profiles table reachable. Ping returned ${(data ?? []).length} row sample. Total count: ${count ?? "unknown"}.`,
      });
    } catch (error) {
      next.push({
        name: "Database query",
        status: "error",
        detail: error instanceof Error ? error.message : "Unknown database error",
      });
    }
    setResults([...next]);

    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .select("created_at")
        .limit(1);

      next.push({
        name: "Database ping",
        status: error ? "error" : "success",
        detail: error ? error.message : "Ping query succeeded against public.profiles without requiring a signed-in session.",
      });
    } catch (error) {
      next.push({
        name: "Database ping",
        status: "error",
        detail: error instanceof Error ? error.message : "Unknown ping error",
      });
    }

    setResults([...next]);
    setRunning(false);
  }

  return (
    <main className="min-h-screen bg-[#060914] px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-200">Temporary Test Page</p>
            <h1 className="mt-2 text-3xl font-black">
              {connected ? "Supabase Connected" : "Supabase Connection Check"}
            </h1>
            <p className="mt-2 text-sm font-semibold text-slate-300">
              Project URL: <span className="text-sky-200">{projectUrl}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={runTests}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-black text-white disabled:bg-white/10 disabled:text-slate-400"
          >
            <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
            Retest
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {results.length === 0 ? (
            <div className="rounded-2xl bg-slate-950/70 p-4 text-sm font-bold text-slate-300">
              Running Supabase checks...
            </div>
          ) : (
            results.map((item) => (
              <section key={item.name} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="flex items-center gap-3">
                  {item.status === "success" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  ) : (
                    <XCircle className="h-5 w-5 text-rose-300" />
                  )}
                  <h2 className="font-black text-white">{item.name}</h2>
                </div>
                <p className="mt-2 break-words text-sm font-semibold text-slate-300">{item.detail}</p>
              </section>
            ))
          )}
        </div>

        <p className="mt-5 rounded-2xl bg-amber-300/10 px-4 py-3 text-xs font-bold text-amber-100">
          Remove this route after verification: src/routes/supabase-test.tsx
        </p>
      </div>
    </main>
  );
}
