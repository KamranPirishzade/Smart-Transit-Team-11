-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CrowdLevel" AS ENUM ('EMPTY', 'MODERATE', 'CROWDED', 'FULL');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DISMISSED');

-- CreateTable
CREATE TABLE "routes" (
    "id" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "carrier" TEXT,
    "tariff_azn" DECIMAL(5,2),
    "length_km" DOUBLE PRECISION NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "first_point" TEXT,
    "last_point" TEXT,
    "avg_daily_passengers" INTEGER,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_directions" (
    "id" SERIAL NOT NULL,
    "route_id" INTEGER NOT NULL,
    "direction" INTEGER NOT NULL,
    "towards" TEXT NOT NULL,
    "geometry" JSONB NOT NULL,
    "geometry_from_stops" BOOLEAN NOT NULL DEFAULT false,
    "length_m" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "route_directions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stops" (
    "id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "is_hub" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_stops" (
    "direction_id" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "stop_id" INTEGER NOT NULL,
    "distance_from_start_m" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "route_stops_pkey" PRIMARY KEY ("direction_id","order")
);

-- CreateTable
CREATE TABLE "crowd_reports" (
    "id" TEXT NOT NULL,
    "route_id" INTEGER NOT NULL,
    "direction" INTEGER,
    "vehicle_id" TEXT,
    "stop_id" INTEGER,
    "level" "CrowdLevel" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "device_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crowd_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "route_id" INTEGER NOT NULL,
    "direction" INTEGER,
    "reason" TEXT NOT NULL,
    "high_reports" INTEGER NOT NULL,
    "total_reports" INTEGER NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserve_dispatches" (
    "id" TEXT NOT NULL,
    "route_id" INTEGER NOT NULL,
    "direction" INTEGER NOT NULL,
    "recommendation_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reserve_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operators" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "routes_number_idx" ON "routes"("number");

-- CreateIndex
CREATE UNIQUE INDEX "route_directions_route_id_direction_key" ON "route_directions"("route_id", "direction");

-- CreateIndex
CREATE INDEX "stops_lat_lon_idx" ON "stops"("lat", "lon");

-- CreateIndex
CREATE INDEX "route_stops_stop_id_idx" ON "route_stops"("stop_id");

-- CreateIndex
CREATE INDEX "crowd_reports_route_id_created_at_idx" ON "crowd_reports"("route_id", "created_at");

-- CreateIndex
CREATE INDEX "crowd_reports_created_at_idx" ON "crowd_reports"("created_at");

-- CreateIndex
CREATE INDEX "recommendations_status_created_at_idx" ON "recommendations"("status", "created_at");

-- CreateIndex
CREATE INDEX "recommendations_route_id_status_idx" ON "recommendations"("route_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "reserve_dispatches_recommendation_id_key" ON "reserve_dispatches"("recommendation_id");

-- CreateIndex
CREATE INDEX "reserve_dispatches_active_idx" ON "reserve_dispatches"("active");

-- CreateIndex
CREATE UNIQUE INDEX "operators_email_key" ON "operators"("email");

-- AddForeignKey
ALTER TABLE "route_directions" ADD CONSTRAINT "route_directions_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_direction_id_fkey" FOREIGN KEY ("direction_id") REFERENCES "route_directions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crowd_reports" ADD CONSTRAINT "crowd_reports_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserve_dispatches" ADD CONSTRAINT "reserve_dispatches_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserve_dispatches" ADD CONSTRAINT "reserve_dispatches_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "recommendations"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- At most one open (PENDING) recommendation per route; guards against concurrent duplicate creation.
CREATE UNIQUE INDEX "recommendations_one_pending_per_route" ON "recommendations"("route_id") WHERE "status" = 'PENDING';
