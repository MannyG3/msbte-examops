import Link from "next/link";
import { ArrowLeft, Clock, Sparkles } from "lucide-react";

interface MilestonePlaceholderProps {
  title: string;
  milestone: string;
  description: string;
  features: string[];
}

export function MilestonePlaceholder({
  title,
  milestone,
  description,
  features,
}: MilestonePlaceholderProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <Link
        href="/dashboard"
        className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
        <div className="inline-flex items-center justify-center p-3.5 bg-blue-50 text-blue-600 rounded-2xl mb-4">
          <Clock className="w-8 h-8" />
        </div>

        <div className="inline-block bg-blue-100 text-blue-800 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-2">
          {milestone}
        </div>

        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{description}</p>

        <div className="mt-8 text-left bg-slate-50 border border-slate-200/80 rounded-xl p-5 max-w-lg mx-auto">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Planned Engine Features:
          </div>
          <ul className="space-y-2 text-xs text-slate-600">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
