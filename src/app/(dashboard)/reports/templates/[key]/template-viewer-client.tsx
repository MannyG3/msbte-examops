"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, Save, Edit3, Eye, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function TemplateViewerClient({
  templateKey,
  initialTitle,
  initialHtml,
  initialCss,
  version,
  variables,
}: {
  templateKey: string;
  initialTitle: string;
  initialHtml: string;
  initialCss: string;
  version: number;
  variables: Record<string, string>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [html, setHtml] = useState(initialHtml);
  const [css, setCss] = useState(initialCss);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const renderedHtml = useMemoRender(html, variables);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/reports/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: templateKey, title, html, css }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save template");
      setMsg(`Saved version v${json.template.version}`);
      setEditing(false);
      router.refresh();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[210mm] mx-auto space-y-6">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
          <div>
            <h1 className="text-sm font-bold text-slate-900">{title}</h1>
            <p className="text-xs text-slate-500">
              Template Key: <code>{templateKey}</code> · v{version}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white hover:bg-slate-50"
          >
            {editing ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            {editing ? "Preview" : "Edit Template"}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg"
          >
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </button>
        </div>
      </div>

      {msg && (
        <div className="print:hidden px-3 py-2 text-xs font-medium bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg">
          {msg}
        </div>
      )}

      {editing ? (
        <div className="print:hidden bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="text-xs text-slate-500">
            Available placeholders:{" "}
            <code>{"{{centreCode}}"}</code>, <code>{"{{instituteName}}"}</code>,{" "}
            <code>{"{{sessionName}}"}</code>, <code>{"{{date}}"}</code>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">HTML Layout</label>
            <textarea
              rows={12}
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Custom CSS</label>
            <textarea
              rows={4}
              value={css}
              onChange={(e) => setCss(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save New Template Version"}
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-300 p-6 shadow-sm print:shadow-none print:border-none text-black">
          <style>{css}</style>
          <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
        </div>
      )}
    </div>
  );
}

function useMemoRender(html: string, vars: Record<string, string>) {
  let out = html;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}
