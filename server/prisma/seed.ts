import dotenv from 'dotenv';
import { PrismaClient, Role, PrivacyLevel } from '@prisma/client';

dotenv.config({ path: '../.env' });

const prisma = new PrismaClient();

async function main() {
  await prisma.comment.deleteMany();
  await prisma.project.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.broadcast.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  const teachers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'ada.teacher@schoolplus.test',
        passwordHash: 'seed-password',
        role: Role.TEACHER,
        name: 'Ada Mensah',
        username: 'ada_mensah',
        skills: ['Computer Science', 'Mentoring'],
      },
    }),
    prisma.user.create({
      data: {
        email: 'samuel.teacher@schoolplus.test',
        passwordHash: 'seed-password',
        role: Role.TEACHER,
        name: 'Samuel Bekele',
        username: 'samuel_bekele',
        skills: ['Mathematics', 'Research'],
      },
    }),
  ]);
  const students = await Promise.all([
    prisma.user.create({
      data: {
        email: 'lina.student@schoolplus.test',
        passwordHash: 'seed-password',
        name: 'Lina Tesfaye',
        username: 'lina_tesfaye',
        skills: ['TypeScript', 'Design'],
      },
    }),
    prisma.user.create({
      data: {
        email: 'dawit.student@schoolplus.test',
        passwordHash: 'seed-password',
        name: 'Dawit Alemu',
        username: 'dawit_alemu',
        skills: ['Python', 'Robotics'],
      },
    }),
    prisma.user.create({
      data: {
        email: 'mekdes.student@schoolplus.test',
        passwordHash: 'seed-password',
        name: 'Mekdes Girma',
        username: 'mekdes_girma',
        skills: ['Research', 'Writing'],
      },
    }),
    prisma.user.create({
      data: {
        email: 'yonas.student@schoolplus.test',
        passwordHash: 'seed-password',
        name: 'Yonas Kebede',
        username: 'yonas_kebede',
        skills: ['Java', 'Databases'],
      },
    }),
    prisma.user.create({
      data: {
        email: 'sara.student@schoolplus.test',
        passwordHash: 'seed-password',
        name: 'Sara Abebe',
        username: 'sara_abebe',
        skills: ['UI Design', 'React'],
      },
    }),
  ]);

  const courses = await Promise.all([
    prisma.course.create({
      data: {
        courseCode: 'CS101',
        name: 'Introduction to Computer Science',
        teacherId: teachers[0].id,
      },
    }),
    prisma.course.create({
      data: { courseCode: 'CS205', name: 'Web Application Development', teacherId: teachers[0].id },
    }),
    prisma.course.create({
      data: { courseCode: 'MATH120', name: 'Applied Mathematics', teacherId: teachers[1].id },
    }),
  ]);

  await prisma.enrollment.createMany({
    data: students.flatMap((student, index) => [
      { studentId: student.id, courseId: courses[index % courses.length].id },
      { studentId: student.id, courseId: courses[(index + 1) % courses.length].id },
    ]),
  });

  const project = await prisma.project.create({
    data: {
      authorId: students[0].id,
      title: 'Campus Study Buddy',
      description:
        'A peer collaboration space for organizing study groups and sharing learning resources.',
      tags: ['education', 'collaboration', 'web'],
      privacyLevel: PrivacyLevel.CAMPUS,
    },
  });
  await prisma.comment.create({
    data: {
      projectId: project.id,
      authorId: students[1].id,
      content: 'I would love to help build the study group feature.',
    },
  });

  console.log('Seeded 2 teachers, 5 students, 3 courses, enrollments, a project, and a comment.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
