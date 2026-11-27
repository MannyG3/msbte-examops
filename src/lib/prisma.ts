import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Executes a Prisma callback inside a transaction with PostgreSQL RLS
 * session variables (`app.current_institute_id` & `app.is_super_admin`) set.
 */
export async function withTenant<T>(
  instituteId: string | null,
  isSuperAdmin: boolean,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_institute_id', ${instituteId ?? ""}, true)`;
      await tx.$executeRaw`SELECT set_config('app.is_super_admin', ${isSuperAdmin ? "true" : "false"}, true)`;
      return fn(tx);
    },
    { maxWait: 10000, timeout: 30000 }
  );
}
