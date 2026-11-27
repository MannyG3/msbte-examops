const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  let trialPlan = await prisma.plan.findUnique({ where: { name: 'Trial' } });
  let standardPlan = await prisma.plan.findUnique({ where: { name: 'Standard' } });

  if (!trialPlan) {
    console.log('Seeding ExamOps Commercial SaaS (Base Platform)...');
    trialPlan = await prisma.plan.create({
      data: {
        name: 'Trial',
        maxCandidatesPerSession: 1500,
        modulesEnabled: ['THEORY_CORE', 'SUPERVISION', 'REPORT_PACK'],
        priceInr: 0,
      },
    });
    standardPlan = await prisma.plan.create({
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
  }

  const passwordHash = await bcrypt.hash('admin123', 10);

  // Super Admin
  await prisma.user.upsert({
    where: { email: 'founder@examops.in' },
    update: {},
    create: {
      email: 'founder@examops.in',
      passwordHash,
      name: 'ExamOps Founder',
      isSuperAdmin: true,
    },
  });

  // Demo Exam Centre 9999
  let demoInst = await prisma.institute.findUnique({ where: { code: '9999' } });
  if (!demoInst) {
    demoInst = await prisma.institute.create({
      data: {
        code: '9999',
        examCentreCode: '9999',
        name: 'Demo Polytechnic Exam Centre, Pune',
        region: 'Pune',
        address: 'Shivajinagar, Pune - 411005, Maharashtra',
        principalName: 'Dr. V. M. Mohitkar',
        contactPerson: 'Prof. S. R. Kulkarni',
        contactEmail: 'oic@demo9999.ac.in',
        planId: standardPlan?.id || trialPlan.id,
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
  }

  // Pending Trial Tenant
  const pendingInst = await prisma.institute.findUnique({ where: { code: '0045' } });
  if (!pendingInst) {
    const pInst = await prisma.institute.create({
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
    const pUser = await prisma.user.create({
      data: { email: 'examcell@gpsatara.ac.in', passwordHash, name: 'Prof. A. K. Joshi' },
    });
    await prisma.membership.create({
      data: { instituteId: pInst.id, userId: pUser.id, role: 'INSTITUTE_ADMIN' },
    });
  }

  // Milestone 2 Seed: Check if blocks already exist for Demo Centre 9999
  const existingBlocks = await prisma.block.count({ where: { instituteId: demoInst.id } });
  if (existingBlocks > 0) {
    console.log('Demo Centre 9999 already populated with M2 data. Skipping.');
    return;
  }

  console.log('Populating Demo Centre 9999 (30 blocks, 60 staff, 18-day W26, ~1200 candidates)...');

  // 1. Active W26 Session
  let w26 = await prisma.examSession.findUnique({
    where: { instituteId_code: { instituteId: demoInst.id, code: 'W26' } },
  });
  if (!w26) {
    w26 = await prisma.examSession.create({
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
  }

  // 2. 30 Rooms & 30 Blocks (4 x 9 = 36 strength, SERPENTINE)
  for (let b = 1; b <= 30; b++) {
    const floor = Math.ceil(b / 10);
    const roomNo = `F-${floor}${String(b % 10 || 10).padStart(2, '0')}`;
    const room = await prisma.room.create({
      data: {
        instituteId: demoInst.id,
        roomNo,
        building: b <= 20 ? 'Main Building' : 'Annex Building',
        floor,
      },
    });
    await prisma.block.create({
      data: {
        instituteId: demoInst.id,
        blockNo: b,
        roomId: room.id,
        columns: 4,
        columnBreak: 9,
        strength: 36,
        numberingStyle: 'SERPENTINE',
      },
    });
  }

  // 3. Schemes K & I + Subjects
  const schemeK = await prisma.scheme.create({
    data: { instituteId: demoInst.id, name: 'K', isActive: true },
  });
  const schemeI = await prisma.scheme.create({
    data: { instituteId: demoInst.id, name: 'I', isActive: true },
  });

  const subjectDefs = [
    // CO, IF, ME, EE across Sem 1, 3, 5 (K & I)
    { code: '311302', name: 'BASIC MATHEMATICS', abbr: 'BMS', schemeId: schemeK.id, csm: 'CO-1-K', hasSections: false },
    { code: '311303', name: 'BASIC SCIENCE', abbr: 'BSC', schemeId: schemeK.id, csm: 'IF-1-K', hasSections: false },
    { code: '311304', name: 'ENGINEERING GRAPHICS', abbr: 'EGR', schemeId: schemeK.id, csm: 'ME-1-K', hasSections: false },
    { code: '311306', name: 'FUNDAMENTALS OF ELECTRICAL', abbr: 'FEE', schemeId: schemeK.id, csm: 'EE-1-K', hasSections: false },
    { code: '313303', name: 'DIGITAL TECHNIQUES', abbr: 'DTE', schemeId: schemeK.id, csm: 'CO-3-K', hasSections: false },
    { code: '313302', name: 'DATABASE MANAGEMENT SYSTEM', abbr: 'DMS', schemeId: schemeK.id, csm: 'IF-3-K', hasSections: false },
    { code: '313310', name: 'ENGINEERING DRAWING & DESIGN', abbr: 'EDD', schemeId: schemeK.id, csm: 'ME-3-K', hasSections: true }, // Section I & II
    { code: '313321', name: 'ELECTRICAL CIRCUITS', abbr: 'ELC', schemeId: schemeK.id, csm: 'EE-3-K', hasSections: false },
    { code: '315319', name: 'OPERATING SYSTEMS', abbr: 'OSY', schemeId: schemeK.id, csm: 'CO-5-K', hasSections: false },
    { code: '315320', name: 'ADVANCED JAVA PROGRAMMING', abbr: 'AJP', schemeId: schemeK.id, csm: 'IF-5-K', hasSections: false },
    { code: '315330', name: 'POWER ENGINEERING', abbr: 'PEN', schemeId: schemeK.id, csm: 'ME-5-K', hasSections: false },
    { code: '315340', name: 'SWITCHGEAR & PROTECTION', abbr: 'SAP', schemeId: schemeK.id, csm: 'EE-5-K', hasSections: false },
    { code: '313301', name: 'DATA STRUCTURE USING C', abbr: 'DSU', schemeId: schemeK.id, csm: 'CO-3-K', hasSections: false },
    { code: '313305', name: 'OBJECT ORIENTED PROGRAMMING', abbr: 'OOP', schemeId: schemeK.id, csm: 'IF-3-K', hasSections: false },
    { code: '313312', name: 'THERMAL ENGINEERING', abbr: 'TEN', schemeId: schemeK.id, csm: 'ME-3-K', hasSections: false },
    { code: '313325', name: 'ELECTRICAL MACHINES', abbr: 'ELM', schemeId: schemeK.id, csm: 'EE-3-K', hasSections: false },
    { code: '315321', name: 'SOFTWARE ENGINEERING', abbr: 'SEN', schemeId: schemeK.id, csm: 'CO-5-K', hasSections: false },
    { code: '315322', name: 'CLIENT SIDE SCRIPTING', abbr: 'CSS', schemeId: schemeK.id, csm: 'IF-5-K', hasSections: false },
    // I-scheme backlog subjects
    { code: '22516', name: 'OPERATING SYSTEMS (I)', abbr: 'OSY-I', schemeId: schemeI.id, csm: 'CO-5-I', hasSections: false },
    { code: '22316', name: 'OBJECT ORIENTED PROG (I)', abbr: 'OOP-I', schemeId: schemeI.id, csm: 'IF-3-I', hasSections: false },
    { code: '22562', name: 'POWER ENGINEERING (I)', abbr: 'PEN-I', schemeId: schemeI.id, csm: 'ME-5-I', hasSections: false },
    { code: '22523', name: 'INDUSTRIAL AC MACHINES (I)', abbr: 'IAM-I', schemeId: schemeI.id, csm: 'EE-5-I', hasSections: false },
  ];

  const createdSubjects = [];
  for (const s of subjectDefs) {
    const subj = await prisma.subject.create({
      data: {
        instituteId: demoInst.id,
        schemeId: s.schemeId,
        code: s.code,
        name: s.name,
        abbreviation: s.abbr,
        hasSections: s.hasSections,
      },
    });
    createdSubjects.push({ ...subj, csm: s.csm });
  }

  // 4. 60 Staff (50 Teaching, 5 Lab Assistants, 5 Peons)
  const depts = ['CO', 'IF', 'ME', 'EE', 'SCI'];
  const staffRows = [];
  for (let i = 1; i <= 60; i++) {
    const type = i <= 50 ? 'TEACHING' : i <= 55 ? 'LAB_ASSISTANT' : 'PEON';
    const dept = depts[(i - 1) % depts.length];
    const subjForStaff = i <= 50 ? [createdSubjects[(i - 1) % createdSubjects.length].code] : [];
    staffRows.push({
      instituteId: demoInst.id,
      name: type === 'TEACHING' ? `Prof. Staff_${String(i).padStart(2, '0')}` : type === 'LAB_ASSISTANT' ? `Tech. Lab_${i}` : `Mr. Peon_${i}`,
      designation: type === 'TEACHING' ? (i <= 5 ? 'HOD' : 'Lecturer') : type === 'LAB_ASSISTANT' ? 'Lab Assistant' : 'Peon',
      department: dept,
      type,
      subjectsTaught: subjForStaff,
      maxDutiesPerSession: type === 'PEON' ? 15 : 10,
      unavailableDates: [],
    });
  }
  await prisma.staff.createMany({ data: staffRows });

  // 5. 18 Exam Days W26 Timetable (skipping Sundays)
  const timetableEntries = [];
  let cursorDate = new Date('2026-11-17T00:00:00Z');
  for (let day = 1; day <= 18; day++) {
    while (cursorDate.getUTCDay() === 0) {
      cursorDate.setUTCDate(cursorDate.getUTCDate() + 1);
    }
    const examDate = new Date(cursorDate);
    // 2 papers Morning, 2 papers Afternoon (4 papers/day across 18 days)
    const slots = ['MORNING', 'AFTERNOON'];
    for (let sIdx = 0; sIdx < slots.length; sIdx++) {
      const slot = slots[sIdx];
      const timeRange = slot === 'MORNING' ? '09:30 A.M. to 12:30 P.M.' : '02:00 P.M. to 05:00 P.M.';
      for (let pIdx = 0; pIdx < 2; pIdx++) {
        const subj = createdSubjects[((day - 1) * 4 + sIdx * 2 + pIdx) % createdSubjects.length];
        // Avoid duplicate unique key on same day+slot
        const already = timetableEntries.find(
          (t) => t.examDay === day && t.slot === slot && t.subjectId === subj.id && t.csm === subj.csm
        );
        if (!already) {
          const entry = await prisma.timetableEntry.create({
            data: {
              instituteId: demoInst.id,
              sessionId: w26.id,
              subjectId: subj.id,
              examDay: day,
              examDate,
              slot,
              timeRange,
              csm: subj.csm,
            },
          });
          timetableEntries.push(entry);
        }
      }
    }
    cursorDate.setUTCDate(cursorDate.getUTCDate() + 1);
  }

  // 6. 1,200 Candidates across CO, IF, ME, EE Sem 1, 3, 5
  const progs = ['CO', 'IF', 'ME', 'EE'];
  const sems = [1, 3, 5];
  const instCodes = ['9999', '9999', '9999', '1227', '0018']; // Home + visiting candidates
  const candidateData = [];
  let seatCounter = 250001;

  for (const prog of progs) {
    for (const sem of sems) {
      for (let k = 1; k <= 100; k++) {
        const seatNo = String(seatCounter++);
        const isI = k <= 5 && sem > 1; // 5 backlog I-scheme candidates per upper sem
        const csm = `${prog}-${sem}-${isI ? 'I' : 'K'}`;
        const isDetained = seatCounter % 200 === 0; // 6 detained candidates
        candidateData.push({
          instituteId: demoInst.id,
          sessionId: w26.id,
          seatNo,
          enrollmentNo: `249999${sem}${String(seatCounter % 1000).padStart(3, '0')}`,
          instCode: instCodes[seatCounter % instCodes.length],
          csm,
          isDetained,
        });
      }
    }
  }
  await prisma.candidate.createMany({ data: candidateData });

  const allCandidates = await prisma.candidate.findMany({ where: { sessionId: w26.id } });

  // 7. Link Candidates to TimetableEntry papers & create QPInventory
  const candidatePapers = [];
  const paperCounts = new Map();

  for (const cand of allCandidates) {
    const matchingEntries = timetableEntries.filter((e) => e.csm === cand.csm);
    for (const entry of matchingEntries) {
      candidatePapers.push({
        instituteId: demoInst.id,
        candidateId: cand.id,
        timetableEntryId: entry.id,
        isDetained: cand.isDetained,
      });
      paperCounts.set(entry.id, (paperCounts.get(entry.id) || 0) + 1);
    }
  }
  await prisma.candidatePaper.createMany({ data: candidatePapers, skipDuplicates: true });

  // QP Inventory (intentionally make first 2 entries 5 QPs short for comparison report demo)
  const qpRows = [];
  let idx = 0;
  for (const entry of timetableEntries) {
    const count = paperCounts.get(entry.id) || 0;
    const qpCount = idx < 2 && count > 5 ? count - 5 : count + 2;
    qpRows.push({
      instituteId: demoInst.id,
      timetableEntryId: entry.id,
      dcCode: 'DC-12',
      ecCode: '9999',
      qpCount,
    });
    idx++;
  }
  await prisma.qPInventory.createMany({ data: qpRows });

  console.log(`✓ Demo Centre 9999 seeded: 30 blocks, 60 staff, ${timetableEntries.length} timetable entries, ${allCandidates.length} candidates, ${candidatePapers.length} candidate-papers.`);

  // =========================================================
  // TENANT #1: RIT POLYTECHNIC, LOHAGAON, PUNE (CODE 1227)
  // =========================================================
  let ritInst = await prisma.institute.findUnique({ where: { code: '1227' } });
  if (!ritInst) {
    ritInst = await prisma.institute.create({
      data: {
        code: '1227',
        examCentreCode: '1227',
        name: "K.E. Society's Rajarambapu Institute of Technology (Polytechnic), Lohagaon",
        nameUpper: "K.E.SOCIETY'S RAJARAMBAPU INSTITUTE OF TECHNOLOGY (POLYTECHNIC),Pune",
        nameTitleCase: "K.E. Society's Rajarambapu Institute of Technology (Polytechnic), Lohagaon",
        region: 'Pune',
        regionCode: '5002',
        address: 'Lohagaon, Pune - 411047, Maharashtra',
        dcCode: '0710',
        dcName: "Jayawant Shikshan Prasarak Mandal's Bhivrabai Sawant Polytechnic, Wagholi",
        oicFullName: 'Javed Babubhai Shaikh',
        oicShortName: 'J. B. Shaikh',
        oicPhone: '9822001227',
        morningOpenTime: '09:10 AM',
        afternoonOpenTime: '01:40 PM',
        receiptTime: '08:15 AM',
        principalName: 'Principal, RIT Polytechnic',
        contactPerson: 'Javed Babubhai Shaikh',
        contactEmail: 'oic@rit1227.ac.in',
        planId: standardPlan?.id || trialPlan.id,
        status: 'ACTIVE',
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isDemo: false,
        dpaAcceptedAt: new Date(),
        dpaAcceptedBy: 'oic@rit1227.ac.in',
        onboardingDone: true,
      },
    });

    const ritOic = await prisma.user.upsert({
      where: { email: 'oic@rit1227.ac.in' },
      update: {},
      create: { email: 'oic@rit1227.ac.in', passwordHash, name: 'Javed Babubhai Shaikh' },
    });
    await prisma.membership.create({
      data: { instituteId: ritInst.id, userId: ritOic.id, role: 'OFFICER_IN_CHARGE' },
    });

    const ritBlocks = [
      { blockNo: 1, roomNo: 'G09', benchLabel: '-G 09 DH-1', gateLocation: 'G09-DH1', shortRoom: 'G09' },
      { blockNo: 2, roomNo: 'G10', benchLabel: '-G 10 DH-2', gateLocation: 'G10-DH2', shortRoom: 'G10' },
      { blockNo: 3, roomNo: 'G11', benchLabel: '-G 11', gateLocation: 'G11', shortRoom: 'G11' },
      { blockNo: 4, roomNo: 'F01', benchLabel: '-F 01', gateLocation: 'F01', shortRoom: 'F01' },
      { blockNo: 5, roomNo: 'F02', benchLabel: '-F 02', gateLocation: 'F02', shortRoom: 'F02' },
      { blockNo: 6, roomNo: 'F03', benchLabel: '-F 03', gateLocation: 'F03', shortRoom: 'F03' },
      { blockNo: 7, roomNo: 'F04', benchLabel: '-F 04', gateLocation: 'F04', shortRoom: 'F04' },
      { blockNo: 8, roomNo: 'F-11', benchLabel: '-F-11', gateLocation: 'F-11', shortRoom: 'F-11' },
    ];

    for (const b of ritBlocks) {
      const rm = await prisma.room.create({
        data: { instituteId: ritInst.id, roomNo: b.roomNo, building: 'Main Building', floor: b.blockNo <= 3 ? 0 : 1 },
      });
      await prisma.block.create({
        data: {
          instituteId: ritInst.id,
          blockNo: b.blockNo,
          roomId: rm.id,
          benchLabel: b.benchLabel,
          gateLocation: b.gateLocation,
          shortRoom: b.shortRoom,
          columns: 4,
          columnBreak: 9,
          strength: 36,
          numberingStyle: 'SERPENTINE',
        },
      });
    }

    const ritSchemes = {};
    for (const sName of ['K', 'I']) {
      ritSchemes[sName] = await prisma.scheme.create({
        data: { instituteId: ritInst.id, name: sName, isActive: true },
      });
    }

    const seededSubjects = [
      { code: '22204', name: 'CONSTRUCTION MATERIALS', abbr: 'CMA', scheme: 'I' },
      { code: '22207', name: 'ENGINEERING DRAWING', abbr: 'EDR', scheme: 'I' },
      { code: '313303', name: 'DIGITAL TECHNIQUES', abbr: 'DTE', scheme: 'K' },
      { code: '311303', name: 'COMMUNICATION SKILLS', abbr: 'ENG', scheme: 'K' },
    ];
    for (const sub of seededSubjects) {
      await prisma.subject.create({
        data: {
          instituteId: ritInst.id,
          schemeId: ritSchemes[sub.scheme].id,
          code: sub.code,
          name: sub.name,
          abbreviation: sub.abbr,
          hasSections: false,
        },
      });
    }

    await prisma.examSession.create({
      data: {
        instituteId: ritInst.id,
        code: 'W26',
        name: 'Winter-2026',
        theoryStartDate: new Date('2026-11-17T00:00:00.000Z'),
        theoryEndDate: new Date('2026-12-09T00:00:00.000Z'),
        status: 'ACTIVE',
      },
    });

    console.log('✓ RIT Polytechnic (Centre 1227) seeded with 8 blocks, 4 core abbreviations, and Winter-2026 session.');
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
