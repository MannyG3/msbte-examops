"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Download,
  Check,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface ColumnMapping {
  enrollmentNo: string;
  seatNo: string;
  rollNo: string;
  name: string;
  semester: string;
  division: string;
  batch: string;
}

export default function StudentImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<"UPLOAD" | "MAP" | "PREVIEW" | "RESULT">("UPLOAD");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    enrollmentNo: "",
    seatNo: "",
    rollNo: "",
    name: "",
    semester: "",
    division: "",
    batch: "",
  });
  const [importSummary, setImportSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  // Handle File Input (CSV or Excel)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields && results.data.length > 0) {
            processParsedData(results.meta.fields, results.data);
          }
        },
      });
    } else if (extension === "xlsx" || extension === "xls") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (data.length > 1) {
          const headers = (data[0] as string[]).map((h) => String(h).trim());
          const rows = data.slice(1).map((row: any) => {
            const rowObj: any = {};
            headers.forEach((h, i) => {
              rowObj[h] = row[i];
            });
            return rowObj;
          });
          processParsedData(headers, rows);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  // Forgiving column auto-detection
  const processParsedData = (headers: string[], rows: any[]) => {
    setRawHeaders(headers);
    setRawRows(rows);

    const autoMap: ColumnMapping = {
      enrollmentNo: "",
      seatNo: "",
      rollNo: "",
      name: "",
      semester: "",
      division: "",
      batch: "",
    };

    headers.forEach((h) => {
      const lower = h.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (lower.includes("enroll") || lower.includes("enrolment") || lower.includes("regno")) {
        autoMap.enrollmentNo = h;
      } else if (lower.includes("seat") || lower.includes("hallticket")) {
        autoMap.seatNo = h;
      } else if (lower.includes("roll") || lower.includes("rollno")) {
        autoMap.rollNo = h;
      } else if (lower.includes("name") || lower.includes("studentname")) {
        autoMap.name = h;
      } else if (lower.includes("sem") || lower.includes("semester")) {
        autoMap.semester = h;
      } else if (lower.includes("div") || lower.includes("division")) {
        autoMap.division = h;
      } else if (lower.includes("batch")) {
        autoMap.batch = h;
      }
    });

    setMapping(autoMap);
    setStep("MAP");
  };

  // Build mapped rows
  const getMappedRows = () => {
    return rawRows.map((row) => ({
      enrollmentNo: row[mapping.enrollmentNo],
      seatNo: mapping.seatNo ? row[mapping.seatNo] : null,
      rollNo: mapping.rollNo ? row[mapping.rollNo] : row[mapping.enrollmentNo]?.slice(-4),
      name: row[mapping.name],
      semester: mapping.semester ? parseInt(row[mapping.semester], 10) || 1 : 1,
      division: mapping.division ? row[mapping.division] : "A",
      batch: mapping.batch ? row[mapping.batch] : null,
    }));
  };

  // Submit to API
  const handleImportSubmit = async () => {
    setLoading(true);
    const mapped = getMappedRows();

    try {
      const res = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mapped, programmeCode: "CO" }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Import failed");
        setLoading(false);
        return;
      }

      setImportSummary(data.summary);
      setStep("RESULT");
    } catch {
      alert("Failed to submit import.");
    } finally {
      setLoading(false);
    }
  };

  // Sample CSV generator
  const downloadSampleCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Enrollment_Number,Student_Name,Seat_Number,Roll_Number,Semester,Division,Batch\n" +
      "2400183061,Aarav Patil,301061,26CO361,3,A,A1\n" +
      "2400183062,Vivaan Deshmukh,301062,26CO362,3,A,A1\n" +
      "2400183063,Aditya Kulkarni,301063,26CO363,3,A,A2\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "msbte_student_roster_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/masters/students"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Student Roster
            </Link>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Bulk Student Roster Importer
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Forgiving CSV/Excel importer with column mapping and auto course enrollment
          </p>
        </div>

        <button
          onClick={downloadSampleCSV}
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-1.5 rounded-lg text-xs font-medium shadow-xs transition"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          Download Sample CSV
        </button>
      </div>

      {/* Stepper Progress */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        <span
          className={`px-3 py-1 rounded-full ${
            step === "UPLOAD" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
          }`}
        >
          1. Upload File
        </span>
        <span className="text-slate-300">→</span>
        <span
          className={`px-3 py-1 rounded-full ${
            step === "MAP" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
          }`}
        >
          2. Map Columns
        </span>
        <span className="text-slate-300">→</span>
        <span
          className={`px-3 py-1 rounded-full ${
            step === "PREVIEW" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
          }`}
        >
          3. Preview & Validate
        </span>
        <span className="text-slate-300">→</span>
        <span
          className={`px-3 py-1 rounded-full ${
            step === "RESULT" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
          }`}
        >
          4. Complete
        </span>
      </div>

      {/* Step 1: Upload */}
      {step === "UPLOAD" && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-center">
          <div className="max-w-md mx-auto">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Upload CSV or Excel File</h2>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Upload exports from your polytechnic ERP or MSBTE portal student list (.csv, .xlsx, .xls)
            </p>

            <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm shadow-sm transition">
              <Upload className="w-4 h-4" />
              Choose File
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === "MAP" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Map File Columns</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Found {rawRows.length} rows in <span className="font-semibold text-slate-700">{fileName}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                MSBTE Enrollment Number (10 Digits) *
              </label>
              <select
                value={mapping.enrollmentNo}
                onChange={(e) => setMapping({ ...mapping, enrollmentNo: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              >
                <option value="">-- Select Column --</option>
                {rawHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Full Name *
              </label>
              <select
                value={mapping.name}
                onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              >
                <option value="">-- Select Column --</option>
                {rawHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                MSBTE Hall Ticket Seat Number (Optional)
              </label>
              <select
                value={mapping.seatNo}
                onChange={(e) => setMapping({ ...mapping, seatNo: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              >
                <option value="">-- None / Generate Later --</option>
                {rawHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Internal Roll Number (Optional)
              </label>
              <select
                value={mapping.rollNo}
                onChange={(e) => setMapping({ ...mapping, rollNo: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              >
                <option value="">-- Auto-derive from Enrollment --</option>
                {rawHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Semester (1 to 6)
              </label>
              <select
                value={mapping.semester}
                onChange={(e) => setMapping({ ...mapping, semester: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              >
                <option value="">-- Default to Sem 1 --</option>
                {rawHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Division (e.g. A, B)
              </label>
              <select
                value={mapping.division}
                onChange={(e) => setMapping({ ...mapping, division: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              >
                <option value="">-- Default to Div A --</option>
                {rawHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between">
            <button
              onClick={() => setStep("UPLOAD")}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
            >
              Choose different file
            </button>
            <button
              disabled={!mapping.enrollmentNo || !mapping.name}
              onClick={() => setStep("PREVIEW")}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-xs shadow-sm transition"
            >
              Preview Data ({rawRows.length} rows) <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview & Validate */}
      {step === "PREVIEW" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Preview & Validate Data ({rawRows.length} rows)
              </h2>
              <p className="text-xs text-slate-500">
                Review mapped fields before committing to database
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep("MAP")}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
              >
                Back to Mapping
              </button>
              <button
                disabled={loading}
                onClick={handleImportSubmit}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-xs shadow-sm transition"
              >
                {loading ? "Importing Records..." : "Confirm & Import to Exam Cell"}
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[400px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Enrollment No</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Seat No</th>
                  <th className="py-2.5 px-3">Roll No</th>
                  <th className="py-2.5 px-3">Sem</th>
                  <th className="py-2.5 px-3">Div</th>
                  <th className="py-2.5 px-3">Batch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {getMappedRows()
                  .slice(0, 20)
                  .map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">
                        {r.enrollmentNo || (
                          <span className="text-rose-500 text-[10px]">Missing</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900">{r.name}</td>
                      <td className="py-2 px-3 font-mono text-blue-600">{r.seatNo || "—"}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{r.rollNo}</td>
                      <td className="py-2 px-3">Sem {r.semester}</td>
                      <td className="py-2 px-3">{r.division}</td>
                      <td className="py-2 px-3">{r.batch || "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {rawRows.length > 20 && (
            <div className="text-center text-[11px] text-slate-400">
              Showing first 20 preview rows of {rawRows.length} total rows
            </div>
          )}
        </div>
      )}

      {/* Step 4: Result Summary */}
      {step === "RESULT" && importSummary && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="text-center max-w-md mx-auto">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full w-14 h-14 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Student Roster Import Completed</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Summary of processed, updated, and validated student records
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-700">
                {importSummary.accepted}
              </div>
              <div className="text-xs font-semibold text-emerald-800 mt-1">Accepted & Enrolled</div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-700">{importSummary.fixed}</div>
              <div className="text-xs font-semibold text-amber-800 mt-1">Autocorrected</div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-rose-700">{importSummary.rejected}</div>
              <div className="text-xs font-semibold text-rose-800 mt-1">Rejected Rows</div>
            </div>
          </div>

          {importSummary.errors?.length > 0 && (
            <div className="max-w-xl mx-auto bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" /> Issues Encountered:
              </div>
              {importSummary.errors.map((err: any, idx: number) => (
                <div key={idx}>
                  Row {err.row}: {err.error}
                </div>
              ))}
            </div>
          )}

          <div className="text-center pt-2">
            <Link
              href="/masters/students"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg text-sm shadow-sm transition"
            >
              View Updated Student Roster <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
