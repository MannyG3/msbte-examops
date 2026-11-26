"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, GraduationCap, AlertCircle, ArrowRight } from "lucide-react";

export default function RegisterInstitutePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    instituteCode: "",
    instituteName: "",
    region: "Pune",
    address: "",
    principalName: "",
    name: "",
    email: "",
    password: "",
    phone: "",
  });
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
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to onboard institute");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl shadow-lg mb-3">
          <Building2 className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Onboard Polytechnic Institute</h1>
        <p className="mt-1 text-sm text-slate-400">
          Set up your MSBTE-affiliated institute exam cell with multi-tenant isolation
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-slate-800/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-slate-700/80 sm:px-10">
          {error && (
            <div className="mb-5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="border-b border-slate-700 pb-3">
              <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide">
                1. Institute Information
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  MSBTE Institute Code (4 Digits) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0018, 0540"
                  maxLength={4}
                  value={formData.instituteCode}
                  onChange={(e) => setFormData({ ...formData, instituteCode: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  MSBTE Region *
                </label>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Pune">Pune</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Nagpur">Nagpur</option>
                  <option value="Chhatrapati Sambhaji Nagar">Chhatrapati Sambhaji Nagar</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">
                Full Institute Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Government Polytechnic, Pune"
                value={formData.instituteName}
                onChange={(e) => setFormData({ ...formData, instituteName: e.target.value })}
                className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Campus Address
                </label>
                <input
                  type="text"
                  placeholder="Shivajinagar, Pune"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Principal Name
                </label>
                <input
                  type="text"
                  placeholder="Dr. V. M. Mohitkar"
                  value={formData.principalName}
                  onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="border-b border-slate-700 pt-2 pb-3">
              <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide">
                2. Exam Cell Coordinator Account
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Coordinator Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Prof. S. R. Kulkarni"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="9822000000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Official Email (Login ID) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="coordinator@institute.ac.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? "Registering Institute..." : "Onboard Institute & Open Exam Cell"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-slate-400">
            Already registered?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Sign In here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
