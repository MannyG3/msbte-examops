"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Upload,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ClipboardPaste,
} from "lucide-react";

export interface TargetField {
  key: string;
  label: string;
  required?: boolean;
  aliases: string[];
}

interface MsbteImporterProps {
  sourceType: "TIMETABLE" | "QP_INVENTORY" | "SEATING_CHART" | "MARKSHEET";
  title: string;
  description: string;
  fields: TargetField[];
  sampleCsv: string;
}

export function MsbteImporter({
  sourceType,
  title,
  description,
  fields,
  sampleCsv,
}: MsbteImporterProps) {
  const router = useRouter();
  const [step, setStep] = useState<"INPUT" | "MAP" | "RESULT">("INPUT");
  const [pasteText, setPasteText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/imports/templates?sourceType=${sourceType}`)
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch(() => {});
  }, [sourceType]);

  const autoDetectMapping = (cols: string[]) => {
    const map: Record<string, string> = {};
    fields.forEach((f) => {
      const match = cols.find((c) => {
        const norm = c.toLowerCase().replace(/[^a-z0-9]/g, "");
        return f.aliases.some((a) => norm.includes(a));
      });
      if (match) map[f.key] = match;
    });
    setMapping(map);
  };

  const handleParsed = (cols: string[], rows: any[]) => {
    setHeaders(cols);
    setRawRows(rows);
    autoDetectMapping(cols);
    setStep("MAP");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          if (res.meta.fields && res.data.length > 0) {
            handleParsed(res.meta.fields, res.data);
          }
        },
      });
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (data.length > 1) {
          const cols = data[0].map((c) => String(c || "").trim());
          const rows = data.slice(1).map((r) => {
            const obj: any = {};
            cols.forEach((c, i) => (obj[c] = r[i]));
            return obj;
          });
          handleParsed(cols, rows);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleParseText = (textToParse?: string) => {
    const text = textToParse ?? pasteText;
    if (!text.trim()) return;
    const delimiter = text.includes("\t") ? "\t" : ",";
    Papa.parse(text.trim(), {
      header: true,
      delimiter,
      skipEmptyLines: true,
      complete: (res) => {
        if (res.meta.fields && res.data.length > 0) {
          handleParsed(res.meta.fields, res.data);
        }
      },
    });
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      alert("Enter a template name first");
      return;
    }
    const res = await fetch("/api/imports/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceType, name: templateName, columnMapping: mapping }),
    });
    if (res.ok) {
      const data = await res.json();
      setTemplates((prev) => [data.template, ...prev.filter((t) => t.id !== data.template.id)]);
      setTemplateName("");
      alert("Column mapping template saved!");
    }
  };

  const getMappedRows = () => {
    return rawRows.map((raw) => {
      const obj: any = {};
      fields.forEach((f) => {
        const col = mapping[f.key];
        obj[f.key] = col ? raw[col] : "";
      });
      return obj;
    });
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType, rows: getMappedRows() }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Import failed");
      } else {
        setSummary(data.summary);
        setStep("RESULT");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/imports" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Portal Importers
          </Link>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>

      {step === "INPUT" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-medium">
              <Upload className="w-4 h-4" /> Upload CSV / Excel
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            </label>
            <button
              type="button"
              onClick={() => {
                setPasteText(sampleCsv);
                handleParseText(sampleCsv);
              }}
              className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg border border-blue-200"
            >
              Load Sample MSBTE Data
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <ClipboardPaste className="w-3.5 h-3.5 text-blue-600" /> Or Paste Directly from Excel / MSBTE Portal (with header row)
            </label>
            <textarea
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste tab-separated or CSV rows including column headers..."
              className="w-full p-3 font-mono text-xs bg-slate-900 text-slate-100 rounded-lg border border-slate-700"
            />
            <div className="flex justify-end">
              <button
                disabled={!pasteText.trim()}
                onClick={() => handleParseText()}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-medium"
              >
                Detect Columns & Preview <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "MAP" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Map Columns ({rawRows.length} rows detected)</h2>
              <p className="text-xs text-slate-500">Match your file headers to ExamOps fields</p>
            </div>

            {templates.length > 0 && (
              <select
                onChange={(e) => {
                  const t = templates.find((x) => x.id === e.target.value);
                  if (t) setMapping(t.columnMapping);
                }}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="">-- Load Saved Template --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {f.label} {f.required && <span className="text-rose-500">*</span>}
                </label>
                <select
                  value={mapping[f.key] || ""}
                  onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="">-- Ignore / Not in file --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Save Template Bar */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <input
              type="text"
              placeholder="Template name (e.g. MSBTE W26 Format)"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
            />
            <button
              type="button"
              onClick={handleSaveTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-xs font-semibold text-slate-700"
            >
              <Save className="w-3.5 h-3.5 text-blue-600" /> Save Mapping Template
            </button>
          </div>

          {/* Preview */}
          <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-64">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="p-2">#</th>
                  {fields.map((f) => (
                    <th key={f.key} className="p-2">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {getMappedRows()
                  .slice(0, 10)
                  .map((r, i) => {
                    const missingReq = fields.some((f) => f.required && !String(r[f.key] || "").trim());
                    return (
                      <tr key={i} className={missingReq ? "bg-rose-50 text-rose-800" : ""}>
                        <td className="p-2 text-slate-400">{i + 1}</td>
                        {fields.map((f) => (
                          <td key={f.key} className="p-2 font-mono">
                            {String(r[f.key] || "—")}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep("INPUT")} className="px-4 py-2 bg-slate-100 rounded-lg text-xs">
              Back
            </button>
            <button
              disabled={loading}
              onClick={handleImport}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-semibold"
            >
              {loading ? "Importing..." : `Import ${rawRows.length} Rows`}
            </button>
          </div>
        </div>
      )}

      {step === "RESULT" && summary && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-5">
          <div className="text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h2 className="text-lg font-bold text-slate-900">Import Completed (Zero Silent Drops)</h2>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto text-center">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="text-2xl font-bold text-emerald-700">{summary.accepted}</div>
              <div className="text-xs font-semibold text-emerald-800">Accepted</div>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="text-2xl font-bold text-amber-700">{summary.fixed}</div>
              <div className="text-xs font-semibold text-amber-800">Auto-Fixed</div>
            </div>
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
              <div className="text-2xl font-bold text-rose-700">{summary.rejected}</div>
              <div className="text-xs font-semibold text-rose-800">Rejected</div>
            </div>
          </div>

          {summary.errors?.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800 space-y-1 max-w-xl mx-auto">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Rejected Row Details:
              </div>
              {summary.errors.slice(0, 15).map((e: any, idx: number) => (
                <div key={idx}>
                  Row {e.row}: {e.error}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-center gap-3">
            <button
              onClick={() => setStep("INPUT")}
              className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-medium"
            >
              Import More
            </button>
            <Link
              href="/imports/comparison"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium"
            >
              Run Student Count Comparison →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
