import { getSession } from "./auth";
import { prisma, withTenant } from "./prisma";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireTenantAuth() {
  const session = await requireAuth();
  if (!session.instituteId) {
    if (session.isSuperAdmin) redirect("/super-admin");
    redirect("/login");
  }
  return session as typeof session & { instituteId: string };
}

export async function requireSuperAdmin() {
  const session = await requireAuth();
  if (!session.isSuperAdmin) {
    redirect("/dashboard");
  }
  return session;
}

export async function requireRole(allowedRoles: string[]) {
  const session = await requireTenantAuth();
  if (!allowedRoles.includes(session.role) && !session.isSuperAdmin) {
    redirect("/dashboard");
  }
  return session;
}

export async function getTenantInstitute(instituteId: string) {
  return withTenant(instituteId, false, async (tx) => {
    return tx.institute.findUnique({
      where: { id: instituteId },
      include: {
        plan: true,
        sessions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
  });
}

export function isTenantReadOnly(institute: {
  status: string;
  validUntil?: Date | null;
  trialEndsAt?: Date | null;
}): boolean {
  if (institute.status === "EXPIRED" || institute.status === "SUSPENDED") return true;
  if (institute.validUntil && new Date(institute.validUntil) < new Date()) return true;
  if (institute.status === "TRIAL" && institute.trialEndsAt && new Date(institute.trialEndsAt) < new Date()) {
    return true;
  }
  return false;
}
