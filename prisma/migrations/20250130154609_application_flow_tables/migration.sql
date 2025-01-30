-- CreateEnum
CREATE TYPE "CameraType" AS ENUM ('START', 'INTERMEDIATE', 'EXIT');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('PENDING', 'PARTIAL_DONE', 'DONE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Camera" (
    "cameraId" SERIAL NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "type" "CameraType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Camera_pkey" PRIMARY KEY ("cameraId")
);

-- CreateTable
CREATE TABLE "Car" (
    "carId" SERIAL NOT NULL,
    "numberPlate" TEXT,
    "color" TEXT NOT NULL DEFAULT 'white',
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Car_pkey" PRIMARY KEY ("carId")
);

-- CreateTable
CREATE TABLE "Route" (
    "routeId" SERIAL NOT NULL,
    "timeStamp" TIMESTAMP(3) NOT NULL,
    "carId" INTEGER NOT NULL,
    "cameraId" INTEGER NOT NULL,
    "previousRouteId" INTEGER,
    "routeStatus" "RouteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Route_pkey" PRIMARY KEY ("routeId")
);

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("carId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("cameraId") ON DELETE RESTRICT ON UPDATE CASCADE;
