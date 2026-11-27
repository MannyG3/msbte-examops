const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const existingPlans = await prisma.plan.count();
  if (existingPlans > 0) {
    console.log('Database already seeded. Skipping seed.');
    return;
  }

  console.log('Seeding ExamOps Commercial SaaS (Milestone 1)...');

  // 1. Plans
  const trialPlan = await prisma.plan.create({
    data: {
      name: 'Trial',
      maxCandidatesPerSession: 1500,
      modulesEnabled: ['THEORY_CORE', 'SUPERVISION', 'REPORT_PACK'],
      priceInr: 0,
    },
  });

  const standardPlan = await prisma.plan.create({
    data: {
      name: 'Standard',
      maxCandidatesPerSession: 3000,
      modulesEnabled: ['THEORY_CORE', 'SUPERVISION', 'REPORT_PACK', 'EXAM_DAY'],
      priceInr: 24000,
    },
  });

  await prisma.plan.create({
    data: {
      name: 'Enterprise',
      maxCandidatesPerSession: 10000,
      modulesEnabled: ['THEORY_CORE', 'SUPERVISION', 'REPORT_PACK', 'EXAM_DAY', 'PRACTICALS', 'RESULTS'],
      priceInr: 48000,
    },
  });

  const passwordHash = await bcrypt.hash('admin123', 10);

  // 2. Platform Founder (Super-Admin)
  await prisma.user.create({
    data: {
      email: 'founder@examops.in',
      passwordHash,
      name: 'ExamOps Founder',
      isSuperAdmin: true,
    },
  });

  // 3. Demo Exam Centre (Code 9999)
  const demoInst = await prisma.institute.create({
    data: {
      code: '9999',
      examCentreCode: '9999',
      name: "Demo Polytechnic Exam Centre, Pune",
      region: 'Pune',
      address: 'Shivajinagar, Pune - 411005, Maharashtra',
      principalName: 'Dr. V. M. Mohitkar',
      contactPerson: 'Prof. S. R. Kulkarni',
      contactEmail: 'oic@demo9999.ac.in',
      planId: standardPlan.id,
      status: 'ACTIVE',
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isDemo: true,
      dpaAcceptedAt: new Date(),
      dpaAcceptedBy: 'oic@demo9999.ac.in',
      onboardingDone: true,
    },
  });

  const oicUser = await prisma.user.create({
    data: { email: 'oic@demo9999.ac.in', passwordHash, name: 'Prof. S. R. Kulkarni' },
  });
  const principalUser = await prisma.user.create({
    data: { email: 'principal@demo9999.ac.in', passwordHash, name: 'Dr. V. M. Mohitkar' },
  });
  const staffUser = await prisma.user.create({
    data: { email: 'staff@demo9999.ac.in', passwordHash, name: 'Prof. M. N. Deshmukh' },
  });

  await prisma.membership.createMany({
    data: [
      { instituteId: demoInst.id, userId: oicUser.id, role: 'OFFICER_IN_CHARGE' },
      { instituteId: demoInst.id, userId: principalUser.id, role: 'PRINCIPAL' },
      { instituteId: demoInst.id, userId: staffUser.id, role: 'SUPERVISOR' },
    ],
  });

  await prisma.specialCode.createMany({
    data: [
      { instituteId: demoInst.id, code: 'AB', label: 'Absent' },
      { instituteId: demoInst.id, code: 'DET', label: 'Detained' },
      { instituteId: demoInst.id, code: 'CC', label: 'Copy Case (UFM)' },
    ],
  });

  await prisma.examSession.create({
    data: {
      instituteId: demoInst.id,
      name: 'Winter-2026',
      code: 'W26',
      practicalStartDate: new Date('2026-10-21'),
      practicalEndDate: new Date('2026-10-31'),
      sem1PracticalStartDate: new Date('2026-11-02'),
      sem1PracticalEndDate: new Date('2026-11-06'),
      theoryStartDate: new Date('2026-11-17'),
      theoryEndDate: new Date('2026-12-09'),
      status: 'ACTIVE',
    },
  });

  // 4. Pending Trial Tenant for Super-Admin approval demo
  const pendingInst = await prisma.institute.create({
    data: {
      code: '0045',
      examCentreCode: '1245',
      name: 'Government Polytechnic, Satara',
      region: 'Pune',
      address: 'Satara, Maharashtra',
      contactPerson: 'Prof. A. K. Joshi',
      contactEmail: 'examcell@gpsatara.ac.in',
      planId: trialPlan.id,
      status: 'PENDING_APPROVAL',
    },
  });
  const pendingUser = await prisma.user.create({
    data: { email: 'examcell@gpsatara.ac.in', passwordHash, name: 'Prof. A. K. Joshi' },
  });
  await prisma.membership.create({
    data: { instituteId: pendingInst.id, userId: pendingUser.id, role: 'INSTITUTE_ADMIN' },
  });

  console.log('✓ Milestone 1 Seed Complete (Plans, Super-Admin, Demo Centre 9999, Pending Trial 0045)');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
