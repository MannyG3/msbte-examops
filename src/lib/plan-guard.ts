import { Prisma } from "@prisma/client";
import { isTenantReadOnly } from "./tenant";

/**
 * Ensures the institute is not expired or suspended before allowing writes/allocations.
 */
export async function assertTenantWritable(
  tx: Prisma.TransactionClient,
  instituteId: string
) {
  const inst = await tx.institute.findUnique({
    where: { id: instituteId },
    include: { plan: true },
  });
  if (!inst) throw new Error("Institute not found");
  if (isTenantReadOnly(inst)) {
    throw new Error(
      "Workspace is in read-only mode (plan expired or suspended). Data remains viewable & exportable; contact ExamOps to renew."
    );
  }
  return inst;
}

/**
 * Enforces the institute plan's maxCandidatesPerSession limit.
 */
export async function assertCandidateQuota(
  tx: Prisma.TransactionClient,
  instituteId: string,
  candidateCount: number
) {
  const inst = await assertTenantWritable(tx, instituteId);
  const limit = inst.plan?.maxCandidatesPerSession ?? 5000;
  if (candidateCount > limit) {
    throw new Error(
      `Candidate count (${candidateCount}) exceeds your plan limit (${limit} candidates/session). Upgrade your plan in Super-Admin.`
    );
  }
}
