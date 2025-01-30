const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const load = async () => {
  try {
    await prisma.camera.createMany({
      data: [
        {
          lat: 24.948633,
          lng: 67.112567,
          type: 'START',
          description: 'Hijri road entrance camera',
        },
        {
          lat: 24.94858,
          lng: 67.112407,
          type: 'EXIT',
          description: 'Hijri road exit camera',
        },
        {
          lat: 24.940909,
          lng: 67.117086,
          type: 'INTERMEDIATE',
          description: 'Hijri road gate to valica chowk camera',
        },
        {
          lat: 24.94084,
          lng: 67.116988,
          type: 'INTERMEDIATE',
          description: 'Maskan gate to valica chowk camera',
        },
        {
          lat: 24.93512,
          lng: 67.106509,
          type: 'START',
          description: 'Maskan gate entrance',
        },
        {
          lat: 24.935086,
          lng: 67.106592,
          type: 'EXIT',
          description: 'Maskan gate exit',
        },
      ],
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

load();
