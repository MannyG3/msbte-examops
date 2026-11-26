import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { History, Shield, User, Clock } from "lucide-react";

export default async function AuditLogsPage() {
  const session = await requireAuth();

  const logs = await prisma.auditLog.findMany({
    where: { instituteId: session.instituteId },
    include: {
      user: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Exam Cell Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all seating, duties, marks updates, and master configurations
          </p>
        </div>
        <div className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-medium flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-blue-600" />
          <span>Tenant Isolated</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {logs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-slate-50 transition">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                      {log.action}
                    </span>
                    <span className="text-xs font-semibold text-blue-600">{log.entity}</span>
                    {log.entityId && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        ID: {log.entityId}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{log.user?.name || "System"}</span>
                    <span className="text-slate-400">•</span>
                    <span>{log.user?.email || "internal"}</span>
                  </div>
                </div>

                <div className="text-right text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {log.afterData && (
                <div className="mt-2.5 p-2 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono text-slate-700 overflow-x-auto max-h-24">
                  {log.afterData}
                </div>
              )}
            </div>
          ))}

          {logs.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              No audit log entries recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
