import Link from "next/link";
import { getSession } from "@/lib/auth";
import {
  GraduationCap,
  Grid,
  ShieldCheck,
  FileText,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Lock,
} from "lucide-react";

export default async function LandingPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Nav */}
      <header className="bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 rounded-xl">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight">ExamOps</span>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
              MSBTE Edition
            </span>
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <Link
                href={session.isSuperAdmin ? "/super-admin" : "/dashboard"}
                className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg"
              >
                Open Dashboard →
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900">
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Request 30-Day Free Trial
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" /> India DPDP Act 2023 Compliant · Mumbai Region (`bom1`)
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Zero-Error MSBTE Exam Centre Automation
          </h1>
          <p className="text-base md:text-lg text-slate-600 leading-relaxed">
            Built for Maharashtra State Board of Technical Education (MSBTE) diploma polytechnics. Import official
            portals, generate exact serpentine bench arrangements, allocate supervisors fairly, mark absentees on mobile,
            and print all 14+ MSBTE A4 reports in one click.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm"
            >
              Request a Demo / Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-white text-slate-800 border border-slate-300 rounded-xl hover:bg-slate-100"
            >
              Try Live Demo (Centre 9999)
            </Link>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Everything Your Exam Cell Needs
          </h2>
          {[
            { icon: Grid, title: "Exact Serpentine Bench Arrangement", desc: "4×9 blocks, (DET) markers, drag-drop & bulk A4 print" },
            { icon: ShieldCheck, title: "Fair Supervisor Allocation", desc: "Equal load, own-subject avoidance, M/A gap & duty swaps" },
            { icon: Sparkles, title: "Mobile Exam-Day Console", desc: "Tap-to-mark absentees, UFM copy cases & block sign-off" },
            { icon: FileText, title: "14+ Official MSBTE Reports", desc: "Attendance (Sec I/II), Gate Chart, Packing Slips, Annexures" },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <f.icon className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-slate-900">{f.title}</div>
                <div className="text-xs text-slate-600 mt-0.5">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>ExamOps — Built for MSBTE Polytechnics · Postgres RLS Multi-Tenant SaaS</span>
          </div>
          <div className="flex gap-4">
            <Link href="/dpa" className="hover:text-slate-800">DPA</Link>
            <Link href="/privacy" className="hover:text-slate-800">Privacy</Link>
            <Link href="/login" className="hover:text-slate-800">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
