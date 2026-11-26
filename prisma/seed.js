const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const existingCount = await prisma.institute.count();
  if (existingCount > 0) {
    console.log('Database already seeded. Skipping seed to preserve existing records.');
    return;
  }

  console.log('Seeding ExamOps database...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.absenteeRecord.deleteMany();
  await prisma.dutySwapRequest.deleteMany();
  await prisma.supervisionDuty.deleteMany();
  await prisma.seatingAllocation.deleteMany();
  await prisma.theoryPaper.deleteMany();
  await prisma.mark.deleteMany();
  await prisma.classTest.deleteMany();
  await prisma.practicalSlot.deleteMany();
  await prisma.externalExaminer.deleteMany();
  await prisma.sessionPhaseChecklist.deleteMany();
  await prisma.examSession.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.studentCourse.deleteMany();
  await prisma.student.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.division.deleteMany();
  await prisma.staffCourse.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.room.deleteMany();
  await prisma.assessmentHead.deleteMany();
  await prisma.course.deleteMany();
  await prisma.scheme.deleteMany();
  await prisma.programme.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();
  await prisma.eligibilityRule.deleteMany();
  await prisma.documentTemplate.deleteMany();
  await prisma.institute.deleteMany();

  // 1. Institute
  const institute = await prisma.institute.create({
    data: {
      code: '0018',
      name: 'Government Polytechnic, Pune',
      region: 'Pune',
      address: '495, Ganeshkhind Road, Shivajinagar, Pune - 411016, Maharashtra',
      logoUrl: '/logo.svg',
      principalName: 'Dr. V. M. Mohitkar',
    },
  });
  console.log(`✓ Created Institute: ${institute.name} (${institute.code})`);

  // Default Eligibility Rule
  await prisma.eligibilityRule.create({
    data: {
      instituteId: institute.id,
      minAttendancePct: 75.0,
      enforceFaPrPass: true,
    },
  });

  // Default Document Template
  await prisma.documentTemplate.create({
    data: {
      instituteId: institute.id,
      templateType: 'DOOR_CHART',
      title: 'MAHARASHTRA STATE BOARD OF TECHNICAL EDUCATION, MUMBAI',
      headerHtml: `<div style="text-align: center; font-weight: bold;">GOVERNMENT POLYTECHNIC, PUNE (0018)<br/>CENTRE WISE SEATING ARRANGEMENT</div>`,
      footerHtml: `<div style="display:flex; justify-content:space-between; margin-top:20px;"><span>Officer-in-Charge</span><span>Senior Supervisor</span><span>Principal</span></div>`,
      signatories: JSON.stringify(['Officer-in-Charge', 'Senior Supervisor', 'Principal']),
    },
  });

  // 2. Users
  const passwordHash = await bcrypt.hash('admin123', 10);
  const coordinatorUser = await prisma.user.create({
    data: {
      instituteId: institute.id,
      email: 'coordinator@gp-pune.ac.in',
      passwordHash,
      name: 'Prof. S. R. Kulkarni',
      phone: '9822012345',
      role: 'COORDINATOR',
    },
  });

  const principalUser = await prisma.user.create({
    data: {
      instituteId: institute.id,
      email: 'principal@gp-pune.ac.in',
      passwordHash,
      name: 'Dr. V. M. Mohitkar',
      phone: '9822011111',
      role: 'PRINCIPAL',
    },
  });

  const hodUser = await prisma.user.create({
    data: {
      instituteId: institute.id,
      email: 'hod.comp@gp-pune.ac.in',
      passwordHash,
      name: 'Dr. A. B. Pawar',
      phone: '9822022222',
      role: 'HOD',
    },
  });

  const facultyUser = await prisma.user.create({
    data: {
      instituteId: institute.id,
      email: 'faculty@gp-pune.ac.in',
      passwordHash,
      name: 'Prof. M. N. Deshmukh',
      phone: '9822033333',
      role: 'FACULTY',
    },
  });
  console.log('✓ Created Core Users: Coordinator, Principal, HOD, Faculty');

  // 3. Department & Programme
  const dept = await prisma.department.create({
    data: {
      instituteId: institute.id,
      name: 'Computer Engineering Department',
      code: 'CO',
      hodId: hodUser.id,
    },
  });

  const programme = await prisma.programme.create({
    data: {
      instituteId: institute.id,
      departmentId: dept.id,
      name: 'Diploma in Computer Engineering',
      code: 'CO',
    },
  });

  // 4. Schemes
  const schemeK = await prisma.scheme.create({
    data: {
      instituteId: institute.id,
      name: 'K',
      startYear: 2023,
      isActive: true,
    },
  });

  const schemeI = await prisma.scheme.create({
    data: {
      instituteId: institute.id,
      name: 'I',
      startYear: 2018,
      isActive: true,
    },
  });

  // 5. Courses & Assessment Heads
  const courseData = [
    // Sem 1 K Scheme
    {
      code: '311302',
      title: 'Basic Mathematics',
      abbreviation: 'BMS',
      semester: 1,
      schemeId: schemeK.id,
      hasTheory: true,
      hasPractical: false,
      heads: [
        { headType: 'FA_TH', maxMarks: 30, minMarks: 10, tag: 'INTERNAL' },
        { headType: 'SA_TH', maxMarks: 70, minMarks: 28, tag: 'EXTERNAL', durationMins: 180 },
        { headType: 'SLA', maxMarks: 25, minMarks: 10, tag: 'INTERNAL' },
      ],
    },
    {
      code: '311303',
      title: 'Basic Science',
      abbreviation: 'BSC',
      semester: 1,
      schemeId: schemeK.id,
      hasTheory: true,
      hasPractical: true,
      heads: [
        { headType: 'FA_TH', maxMarks: 30, minMarks: 10, tag: 'INTERNAL' },
        { headType: 'SA_TH', maxMarks: 70, minMarks: 28, tag: 'EXTERNAL', durationMins: 180 },
        { headType: 'FA_PR', maxMarks: 25, minMarks: 10, tag: 'INTERNAL' },
        { headType: 'SA_PR', maxMarks: 25, minMarks: 10, tag: 'INTERNAL' },
      ],
    },
    {
      code: '311305',
      title: 'Fundamentals of ICT',
      abbreviation: 'ICT',
      semester: 1,
      schemeId: schemeK.id,
      hasTheory: false,
      hasPractical: true,
      heads: [
        { headType: 'FA_PR', maxMarks: 50, minMarks: 20, tag: 'INTERNAL' },
        { headType: 'SA_PR', maxMarks: 50, minMarks: 20, tag: 'INTERNAL_ONLINE' },
      ],
    },

    // Sem 3 K Scheme
    {
      code: '313301',
      title: 'Programming in C',
      abbreviation: 'PIC',
      semester: 3,
      schemeId: schemeK.id,
      hasTheory: true,
      hasPractical: true,
      heads: [
        { headType: 'FA_TH', maxMarks: 30, minMarks: 10, tag: 'INTERNAL' },
        { headType: 'SA_TH', maxMarks: 70, minMarks: 28, tag: 'EXTERNAL', durationMins: 180 },
        { headType: 'FA_PR', maxMarks: 25, minMarks: 10, tag: 'INTERNAL' },
        { headType: 'SA_PR', maxMarks: 25, minMarks: 10, tag: 'EXTERNAL' },
      ],
    },
    {
      code: '313302',
      title: 'Database Management Systems',
      abbreviation: 'DMS',
      semester: 3,
      schemeId: schemeK.id,
      hasTheory: true,
      hasPractical: true,
      heads: [
        { headType: 'FA_TH', maxMarks: 30, minMarks: 10, tag: 'INTERNAL' },
        { headType: 'SA_TH', maxMarks: 70, minMarks: 28, tag: 'EXTERNAL', durationMins: 180 },
        { headType: 'FA_PR', maxMarks: 25, minMarks: 10, tag: 'INTERNAL' },
        { headType: 'SA_PR', maxMarks: 50, minMarks: 20, tag: 'EXTERNAL' },
      ],
    },
    {
      code: '313303',
      title: 'Data Structures using C',
      abbreviation: 'DSU',
      semester: 3,
      schemeId: schemeK.id,
      hasTheory: true,
      hasPractical: true,
      heads: [
        { headType: 'FA_TH', maxMarks: 30, minMarks: 10, tag: 'INTERNAL' },
        { headType: 'SA_TH', maxMarks: 70, minMarks: 28, tag: 'EXTERNAL', durationMins: 180 },
        { headType: 'FA_PR', maxMarks: 25, minMarks: 10, tag: 'INTERNAL' },
        { headType: 'SA_PR', maxMarks: 25, minMarks: 10, tag: 'EXTERNAL' },
      ],
    },
    {
      code: '313304',
      title: 'Computer Graphics',
      abbreviation: 'CGR',
      semester: 3,
      schemeId: schemeK.id,
      hasTheory: true,
      hasPractical: true,
      heads: [
        { headType: 'FA_TH', maxMarks: 30, minMarks: 10, tag: 'INTERNAL' },
        { headType: 'SA_TH', maxMarks: 70, minMarks: 28, tag: 'EXTERNAL', durationMins: 180 },
        { headType: 'FA_PR', maxMarks: 25, minMarks: 10, tag: 'INTERNAL' },
        { headType: 'SA_PR', maxMarks: 25, minMarks: 10, tag: 'INTERNAL' },
      ],
    },

    // Sem 5 K Scheme
    {
      code: '315319',
      title: 'Operating Systems',
      abbreviation: 'OSY',
      semester: 5,
      schemeId: schemeK.id,
      hasTheory: true,
      hasPractical: true,
      heads: [
        { headType: 'FA_TH', maxMarks: 30, minMarks: 10, tag: 'INTERNAL' },
        { headType: 'SA_TH', maxMarks: 70, minMarks: 28, tag: 'EXTERNAL', durationMins: 180 },
        { headType: 'FA_PR', maxMarks: 25, minMarks: 10, tag: 'INTERNAL' },
        { headType: 'SA_PR', maxMarks: 25, minMarks: 10, tag: 'EXTERNAL' },
      ],
    },
    {
      code: '315320',
      title: 'Advanced Java Programming',
      abbreviation: 'AJP',
      semester: 5,
      schemeId: schemeK.id,
      hasTheory: true,
      hasPractical: true,
      heads: [
        { headType: 'FA_TH', maxMarks: 30, minMarks: 10, tag: 'INTERNAL' },
        { headType: 'SA_TH', maxMarks: 70, minMarks: 28, tag: 'EXTERNAL', durationMins: 180 },
        { headType: 'FA_PR', maxMarks: 25, minMarks: 10, tag: 'INTERNAL' },
        { headType: 'SA_PR', maxMarks: 50, minMarks: 20, tag: 'EXTERNAL' },
      ],
    },
    {
      code: '315321',
      title: 'Software Engineering',
      abbreviation: 'SEN',
      semester: 5,
      schemeId: schemeK.id,
      hasTheory: true,
      hasPractical: false,
      heads: [
        { headType: 'FA_TH', maxMarks: 30, minMarks: 10, tag: 'INTERNAL' },
        { headType: 'SA_TH', maxMarks: 70, minMarks: 28, tag: 'EXTERNAL', durationMins: 180 },
        { headType: 'FA_PR', maxMarks: 25, minMarks: 10, tag: 'INTERNAL' },
        { headType: 'SLA', maxMarks: 25, minMarks: 10, tag: 'INTERNAL' },
      ],
    },
    {
      code: '315322',
      title: 'Client Side Scripting',
      abbreviation: 'CSS',
      semester: 5,
      schemeId: schemeK.id,
      hasTheory: false,
      hasPractical: true,
      heads: [
        { headType: 'FA_PR', maxMarks: 25, minMarks: 10, tag: 'INTERNAL' },
        { headType: 'SA_PR', maxMarks: 50, minMarks: 20, tag: 'INTERNAL_ONLINE' },
      ],
    },

    // Legacy Sem 5 I Scheme
    {
      code: '22516',
      title: 'Operating System (I Scheme Backlog)',
      abbreviation: 'OSY-I',
      semester: 5,
      schemeId: schemeI.id,
      hasTheory: true,
      hasPractical: true,
      heads: [
        { headType: 'FA_TH', maxMarks: 30, minMarks: 10, tag: 'INTERNAL' },
        { headType: 'SA_TH', maxMarks: 70, minMarks: 28, tag: 'EXTERNAL', durationMins: 180 },
        { headType: 'FA_PR', maxMarks: 25, minMarks: 10, tag: 'INTERNAL' },
        { headType: 'SA_PR', maxMarks: 25, minMarks: 10, tag: 'EXTERNAL' },
      ],
    },
  ];

  const createdCourses = {};
  for (const c of courseData) {
    const course = await prisma.course.create({
      data: {
        programmeId: programme.id,
        schemeId: c.schemeId,
        code: c.code,
        title: c.title,
        abbreviation: c.abbreviation,
        semester: c.semester,
        hasTheory: c.hasTheory,
        hasPractical: c.hasPractical,
      },
    });
    createdCourses[c.code] = course;

    for (const h of c.heads) {
      await prisma.assessmentHead.create({
        data: {
          courseId: course.id,
          headType: h.headType,
          maxMarks: h.maxMarks,
          minMarks: h.minMarks,
          tag: h.tag,
          durationMins: h.durationMins || null,
        },
      });
    }
  }
  console.log(`✓ Created ${Object.keys(createdCourses).length} Courses with Assessment Heads`);

  // 6. Rooms (12 rooms)
  const roomDefs = [
    { name: 'Room 101', building: 'Main Building', floor: 1, benchCount: 15, seatsPerBench: 2, type: 'CLASSROOM' },
    { name: 'Room 102', building: 'Main Building', floor: 1, benchCount: 15, seatsPerBench: 2, type: 'CLASSROOM' },
    { name: 'Room 103', building: 'Main Building', floor: 1, benchCount: 15, seatsPerBench: 2, type: 'CLASSROOM' },
    { name: 'Room 104', building: 'Main Building', floor: 1, benchCount: 15, seatsPerBench: 2, type: 'CLASSROOM' },
    { name: 'Room 201', building: 'Main Building', floor: 2, benchCount: 15, seatsPerBench: 2, type: 'CLASSROOM' },
    { name: 'Room 202', building: 'Main Building', floor: 2, benchCount: 15, seatsPerBench: 2, type: 'CLASSROOM' },
    { name: 'Room 203', building: 'Main Building', floor: 2, benchCount: 15, seatsPerBench: 2, type: 'CLASSROOM' },
    { name: 'Room 204', building: 'Main Building', floor: 2, benchCount: 15, seatsPerBench: 2, type: 'CLASSROOM' },
    { name: 'Room 301', building: 'Annex Building', floor: 3, benchCount: 20, seatsPerBench: 2, type: 'CLASSROOM' },
    { name: 'Room 302', building: 'Annex Building', floor: 3, benchCount: 20, seatsPerBench: 2, type: 'CLASSROOM' },
    { name: 'Lab 1 - Network Lab', building: 'Annex Building', floor: 1, benchCount: 15, seatsPerBench: 2, type: 'LAB', labEquipmentCount: 30 },
    { name: 'Lab 2 - Software Lab', building: 'Annex Building', floor: 2, benchCount: 15, seatsPerBench: 2, type: 'LAB', labEquipmentCount: 30 },
  ];

  for (const r of roomDefs) {
    await prisma.room.create({
      data: {
        instituteId: institute.id,
        name: r.name,
        building: r.building,
        floor: r.floor,
        benchCount: r.benchCount,
        seatsPerBench: r.seatsPerBench,
        totalCapacity: r.benchCount * r.seatsPerBench,
        type: r.type,
        labEquipmentCount: r.labEquipmentCount || null,
      },
    });
  }
  console.log(`✓ Created 12 Rooms (Total capacity: 380 seats)`);

  // 7. Staff (30 staff members)
  const staffList = [
    { name: 'Dr. A. B. Pawar', email: 'hod.comp@gp-pune.ac.in', designation: 'HOD & Professor', type: 'TEACHING', maxDuties: 6, userId: hodUser.id },
    { name: 'Prof. S. R. Kulkarni', email: 'coordinator@gp-pune.ac.in', designation: 'Exam Coordinator & Lecturer', type: 'TEACHING', maxDuties: 5, userId: coordinatorUser.id },
    { name: 'Prof. M. N. Deshmukh', email: 'faculty@gp-pune.ac.in', designation: 'Lecturer in Comp Engg', type: 'TEACHING', maxDuties: 10, userId: facultyUser.id },
    { name: 'Prof. P. V. Patil', email: 'pv.patil@gp-pune.ac.in', designation: 'Lecturer in Comp Engg', type: 'TEACHING', maxDuties: 10 },
    { name: 'Prof. R. S. Joshi', email: 'rs.joshi@gp-pune.ac.in', designation: 'Lecturer in Comp Engg', type: 'TEACHING', maxDuties: 10 },
    { name: 'Prof. S. M. Shinde', email: 'sm.shinde@gp-pune.ac.in', designation: 'Lecturer in Comp Engg', type: 'TEACHING', maxDuties: 10 },
    { name: 'Prof. V. K. More', email: 'vk.more@gp-pune.ac.in', designation: 'Lecturer in Comp Engg', type: 'TEACHING', maxDuties: 10 },
    { name: 'Prof. K. G. Jadhav', email: 'kg.jadhav@gp-pune.ac.in', designation: 'Lecturer in Comp Engg', type: 'TEACHING', maxDuties: 10 },
    { name: 'Prof. N. D. Gite', email: 'nd.gite@gp-pune.ac.in', designation: 'Lecturer in Comp Engg', type: 'TEACHING', maxDuties: 10 },
    { name: 'Prof. S. T. Chavan', email: 'st.chavan@gp-pune.ac.in', designation: 'Lecturer in Comp Engg', type: 'TEACHING', maxDuties: 10 },
    { name: 'Prof. A. R. Gaikwad', email: 'ar.gaikwad@gp-pune.ac.in', designation: 'Lecturer in Math', type: 'TEACHING', maxDuties: 10 },
    { name: 'Prof. T. K. Bhosle', email: 'tk.bhosle@gp-pune.ac.in', designation: 'Lecturer in Physics', type: 'TEACHING', maxDuties: 10 },
    { name: 'Prof. D. B. Sonawane', email: 'db.sonawane@gp-pune.ac.in', designation: 'Lecturer in Chemistry', type: 'TEACHING', maxDuties: 10 },
    { name: 'Prof. R. P. Kadam', email: 'rp.kadam@gp-pune.ac.in', designation: 'Lecturer in Comp Engg', type: 'TEACHING', maxDuties: 10 },
    { name: 'Prof. H. U. Shaikh', email: 'hu.shaikh@gp-pune.ac.in', designation: 'Lecturer in Comp Engg', type: 'TEACHING', maxDuties: 10 },
    { name: 'Prof. M. B. Salunkhe', email: 'mb.salunkhe@gp-pune.ac.in', designation: 'Lecturer in Comp Engg', type: 'TEACHING', maxDuties: 10 },
    { name: 'Prof. Y. N. Thorat', email: 'yn.thorat@gp-pune.ac.in', designation: 'Lecturer in Comp Engg', type: 'TEACHING', maxDuties: 10 },
    { name: 'Prof. G. S. Waghmare', email: 'gs.waghmare@gp-pune.ac.in', designation: 'Lecturer in Comp Engg', type: 'TEACHING', maxDuties: 10 },
    { name: 'Prof. B. C. Mane', email: 'bc.mane@gp-pune.ac.in', designation: 'Lecturer in Comp Engg', type: 'TEACHING', maxDuties: 10 },
    { name: 'Prof. L. P. Kale', email: 'lp.kale@gp-pune.ac.in', designation: 'Lecturer in Comp Engg', type: 'TEACHING', maxDuties: 10 },
    { name: 'Prof. O. D. Tambe', email: 'od.tambe@gp-pune.ac.in', designation: 'Lecturer in Comp Engg', type: 'TEACHING', maxDuties: 10 },
    { name: 'Prof. W. K. Solanki', email: 'wk.solanki@gp-pune.ac.in', designation: 'Lecturer in Comp Engg', type: 'TEACHING', maxDuties: 10 },
    { name: 'Prof. C. S. Navale', email: 'cs.navale@gp-pune.ac.in', designation: 'Lecturer in Comp Engg', type: 'TEACHING', maxDuties: 10 },
    { name: 'Prof. Z. A. Qureshi', email: 'za.qureshi@gp-pune.ac.in', designation: 'Lecturer in Comp Engg', type: 'TEACHING', maxDuties: 10 },
    // Lab Assistants
    { name: 'Mr. Ramesh Shinde', email: 'ramesh.lab@gp-pune.ac.in', designation: 'Technical Assistant', type: 'LAB_ASSISTANT', maxDuties: 8 },
    { name: 'Mr. Ganesh Jagtap', email: 'ganesh.lab@gp-pune.ac.in', designation: 'Technical Assistant', type: 'LAB_ASSISTANT', maxDuties: 8 },
    { name: 'Ms. Sunita Patil', email: 'sunita.lab@gp-pune.ac.in', designation: 'Technical Assistant', type: 'LAB_ASSISTANT', maxDuties: 8 },
    // Peons
    { name: 'Mr. Vitthal Thorat', email: 'vitthal.peon@gp-pune.ac.in', designation: 'Exam Peon', type: 'PEON', maxDuties: 15 },
    { name: 'Mr. Balu Kamble', email: 'balu.peon@gp-pune.ac.in', designation: 'Exam Peon', type: 'PEON', maxDuties: 15 },
    { name: 'Mr. Santosh Chavan', email: 'santosh.peon@gp-pune.ac.in', designation: 'Exam Peon', type: 'PEON', maxDuties: 15 },
  ];

  const createdStaff = [];
  for (const s of staffList) {
    const staff = await prisma.staff.create({
      data: {
        instituteId: institute.id,
        departmentId: dept.id,
        name: s.name,
        email: s.email,
        phone: '98' + Math.floor(10000000 + Math.random() * 90000000),
        designation: s.designation,
        type: s.type,
        maxDutiesPerSession: s.maxDuties,
        userId: s.userId || null,
      },
    });
    createdStaff.push(staff);
  }
  console.log(`✓ Created 30 Staff members (24 Faculty, 3 Lab Assistants, 3 Peons)`);

  // Map teaching courses for a few faculty
  await prisma.staffCourse.create({ data: { staffId: createdStaff[2].id, courseId: createdCourses['315319'].id } }); // OSY
  await prisma.staffCourse.create({ data: { staffId: createdStaff[3].id, courseId: createdCourses['315320'].id } }); // AJP
  await prisma.staffCourse.create({ data: { staffId: createdStaff[4].id, courseId: createdCourses['313301'].id } }); // PIC
  await prisma.staffCourse.create({ data: { staffId: createdStaff[5].id, courseId: createdCourses['313302'].id } }); // DMS

  // 8. Divisions, Batches & Students (Sem 1, Sem 3, Sem 5 - 60 students each = 180 students)
  const semesters = [1, 3, 5];
  const firstNames = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
    'Shaurya', 'Atharv', 'Advik', 'Pranav', 'Advaith', 'Aaryan', 'Dhruv', 'Kabir', 'Rishi', 'Kian',
    'Ananya', 'Diya', 'Gauri', 'Aadhya', 'Pari', 'Saanvi', 'Isha', 'Avani', 'Myra', 'Riya',
    'Shruti', 'Tanvi', 'Siya', 'Neha', 'Prisha', 'Sneha', 'Pooja', 'Anushka', 'Kavya', 'Riddhi',
    'Om', 'Yash', 'Siddharth', 'Tejas', 'Rohan', 'Chinmay', 'Harsh', 'Mayur', 'Sanket', 'Prathamesh',
    'Shubham', 'Abhishek', 'Kunal', 'Akash', 'Suraj', 'Swapnil', 'Vaibhav', 'Nikhil', 'Ganesh', 'Tushar'
  ];
  const lastNames = [
    'Patil', 'Deshmukh', 'Kulkarni', 'Jadhav', 'Pawar', 'Chavan', 'Shinde', 'Gaikwad', 'Bhosale', 'More',
    'Thorat', 'Waghmare', 'Kale', 'Mane', 'Kamble', 'Sonawane', 'Tambe', 'Gite', 'Solanki', 'Navale'
  ];

  let studentCount = 0;
  for (const sem of semesters) {
    const division = await prisma.division.create({
      data: {
        programmeId: programme.id,
        semester: sem,
        name: 'A',
        academicYear: '2026-2027',
      },
    });

    const b1 = await prisma.batch.create({ data: { divisionId: division.id, name: 'A1' } });
    const b2 = await prisma.batch.create({ data: { divisionId: division.id, name: 'A2' } });
    const b3 = await prisma.batch.create({ data: { divisionId: division.id, name: 'A3' } });
    const batches = [b1, b2, b3];

    // Relevant courses for this semester
    const semCourses = Object.values(createdCourses).filter(c => c.semester === sem && c.schemeId === schemeK.id);

    for (let i = 1; i <= 60; i++) {
      const fName = firstNames[(i - 1) % firstNames.length];
      const lName = lastNames[(i - 1) % lastNames.length];
      const fullName = `${fName} ${lName}`;
      const rollNo = `26CO${sem}${String(i).padStart(2, '0')}`;
      const enrollNo = `240018${sem}${String(i).padStart(3, '0')}`; // e.g. 2400181001
      const seatNo = `${sem}01${String(i).padStart(3, '0')}`; // e.g. 101001, 301001, 501001
      const batch = batches[Math.floor((i - 1) / 20)]; // 20 per batch

      const student = await prisma.student.create({
        data: {
          instituteId: institute.id,
          programmeId: programme.id,
          divisionId: division.id,
          batchId: batch.id,
          enrollmentNo: enrollNo,
          seatNo: seatNo,
          rollNo: rollNo,
          name: fullName,
          semester: sem,
          status: 'REGULAR',
        },
      });
      studentCount++;

      // Enroll in regular courses
      for (const sc of semCourses) {
        await prisma.studentCourse.create({
          data: {
            studentId: student.id,
            courseId: sc.id,
            type: 'REGULAR',
          },
        });
      }

      // Add a couple of Sem 5 students with backlog I-scheme course (OSY-I: 22516)
      if (sem === 5 && (i === 1 || i === 2 || i === 3)) {
        await prisma.studentCourse.create({
          data: {
            studentId: student.id,
            courseId: createdCourses['22516'].id,
            type: 'BACKLOG_ATKT',
          },
        });
      }
    }
  }
  console.log(`✓ Created 3 Divisions with 9 Batches and ${studentCount} Students across Sem 1, 3, 5`);

  // 9. Exam Session W26
  const session = await prisma.examSession.create({
    data: {
      instituteId: institute.id,
      code: 'W26',
      name: 'Winter 2026 Examination',
      academicYear: '2026-2027',
      practicalStartDate: new Date('2026-10-21'),
      practicalEndDate: new Date('2026-10-31'),
      sem1PracticalStartDate: new Date('2026-11-02'),
      sem1PracticalEndDate: new Date('2026-11-06'),
      theoryStartDate: new Date('2026-11-17'),
      theoryEndDate: new Date('2026-12-09'),
      expectedResultDate: new Date('2027-01-15'),
      isCurrent: true,
    },
  });
  console.log(`✓ Created Session: ${session.name} (${session.code})`);

  // Phase Checklist
  const checklist = [
    { title: 'Class Test 1 Marks Entry & Portal Verification', phase: 'CLASS_TEST', dueDate: new Date('2026-09-25'), isCompleted: true, ownerName: 'Prof. S. R. Kulkarni' },
    { title: 'Class Test 2 Marks Entry & FA-TH Computation', phase: 'CLASS_TEST', dueDate: new Date('2026-10-15'), isCompleted: true, ownerName: 'Prof. S. R. Kulkarni' },
    { title: 'External Examiner Panel Approval from Principal', phase: 'PRACTICAL', dueDate: new Date('2026-10-18'), isCompleted: true, ownerName: 'Dr. A. B. Pawar' },
    { title: 'Internal & External Practical Window Conduct', phase: 'PRACTICAL', dueDate: new Date('2026-11-06'), isCompleted: false, ownerName: 'HOD & Coordinator' },
    { title: 'FA-PR Detention List Generation & Notice Board Display', phase: 'PRACTICAL', dueDate: new Date('2026-11-08'), isCompleted: false, ownerName: 'Prof. S. R. Kulkarni' },
    { title: 'Theory Timetable Import & Scheme Parsing', phase: 'THEORY', dueDate: new Date('2026-11-10'), isCompleted: true, ownerName: 'Prof. S. R. Kulkarni' },
    { title: 'Room-wise Seating Arrangement Generation & Door Charts', phase: 'THEORY', dueDate: new Date('2026-11-13'), isCompleted: false, ownerName: 'Prof. S. R. Kulkarni' },
    { title: 'Junior Supervisor & Reliever Duty Order Distribution', phase: 'THEORY', dueDate: new Date('2026-11-14'), isCompleted: false, ownerName: 'Prof. S. R. Kulkarni' },
    { title: 'Theory Examination Conduct & Daily Absentees / UFM', phase: 'THEORY', dueDate: new Date('2026-12-09'), isCompleted: false, ownerName: 'Chief Supervisor' },
    { title: 'MSBTE Result Import & Department Analysis Report', phase: 'RESULTS', dueDate: new Date('2027-01-20'), isCompleted: false, ownerName: 'Coordinator & HOD' },
  ];

  for (const item of checklist) {
    await prisma.sessionPhaseChecklist.create({
      data: {
        sessionId: session.id,
        title: item.title,
        phase: item.phase,
        dueDate: item.dueDate,
        isCompleted: item.isCompleted,
        ownerName: item.ownerName,
        completedAt: item.isCompleted ? new Date() : null,
      },
    });
  }

  // 10. Sample Theory Timetable
  const timetable = [
    { date: new Date('2026-11-17'), slot: 'MORNING', start: '09:30 AM', end: '12:30 PM', code: '315319', name: 'Operating Systems', schemeStr: 'CO-5-K', prog: 'CO', sem: 5, scheme: 'K' },
    { date: new Date('2026-11-17'), slot: 'AFTERNOON', start: '02:00 PM', end: '05:00 PM', code: '313301', name: 'Programming in C', schemeStr: 'CO-3-K', prog: 'CO', sem: 3, scheme: 'K' },
    { date: new Date('2026-11-19'), slot: 'MORNING', start: '09:30 AM', end: '12:30 PM', code: '315320', name: 'Advanced Java Programming', schemeStr: 'CO-5-K', prog: 'CO', sem: 5, scheme: 'K' },
    { date: new Date('2026-11-19'), slot: 'AFTERNOON', start: '02:00 PM', end: '05:00 PM', code: '313302', name: 'Database Management Systems', schemeStr: 'CO-3-K', prog: 'CO', sem: 3, scheme: 'K' },
    { date: new Date('2026-11-21'), slot: 'MORNING', start: '09:30 AM', end: '12:30 PM', code: '311302', name: 'Basic Mathematics', schemeStr: 'CO-1-K', prog: 'CO', sem: 1, scheme: 'K' },
    { date: new Date('2026-11-21'), slot: 'MORNING', start: '09:30 AM', end: '12:30 PM', code: '22516', name: 'Operating System (Backlog)', schemeStr: 'CO-5-I', prog: 'CO', sem: 5, scheme: 'I' },
    { date: new Date('2026-11-21'), slot: 'AFTERNOON', start: '02:00 PM', end: '05:00 PM', code: '313303', name: 'Data Structures using C', schemeStr: 'CO-3-K', prog: 'CO', sem: 3, scheme: 'K' },
    { date: new Date('2026-11-24'), slot: 'MORNING', start: '09:30 AM', end: '12:30 PM', code: '315321', name: 'Software Engineering', schemeStr: 'CO-5-K', prog: 'CO', sem: 5, scheme: 'K' },
    { date: new Date('2026-11-24'), slot: 'AFTERNOON', start: '02:00 PM', end: '05:00 PM', code: '311303', name: 'Basic Science', schemeStr: 'CO-1-K', prog: 'CO', sem: 1, scheme: 'K' },
  ];

  for (const t of timetable) {
    const course = createdCourses[t.code];
    if (course) {
      await prisma.theoryPaper.create({
        data: {
          sessionId: session.id,
          courseId: course.id,
          examDate: t.date,
          slot: t.slot,
          startTime: t.start,
          endTime: t.end,
          schemeString: t.schemeStr,
          parsedProgramme: t.prog,
          parsedSemester: t.sem,
          parsedScheme: t.scheme,
          paperCode: t.code,
          paperName: t.name,
        },
      });
    }
  }
  console.log(`✓ Created Sample W26 Theory Timetable (${timetable.length} Papers)`);

  // Initial Audit Log
  await prisma.auditLog.create({
    data: {
      instituteId: institute.id,
      userId: coordinatorUser.id,
      action: 'SYSTEM_INIT',
      entity: 'Institute',
      entityId: institute.id,
      afterData: JSON.stringify({ message: 'ExamOps initialized with demo data for Government Polytechnic, Pune' }),
    },
  });

  console.log('\n=========================================');
  console.log('Seed completed successfully!');
  console.log('Demo Login Credentials:');
  console.log('Coordinator: coordinator@gp-pune.ac.in / admin123');
  console.log('Principal:   principal@gp-pune.ac.in   / admin123');
  console.log('HOD:         hod.comp@gp-pune.ac.in    / admin123');
  console.log('Faculty:     faculty@gp-pune.ac.in     / admin123');
  console.log('=========================================\n');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
