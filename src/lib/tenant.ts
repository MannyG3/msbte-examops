import { getSession } from "./auth";
import { prisma } from "./prisma";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(allowedRoles: string[]) {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.role)) {
    redirect("/dashboard");
  }
  return session;
}

export async function getTenantInstitute(instituteId: string) {
  return prisma.institute.findUnique({
    where: { id: instituteId },
    include: {
      examSessions: {
        where: { isCurrent: true },
        take: 1,
      },
    },
  });
}
