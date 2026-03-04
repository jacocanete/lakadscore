-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('sidewalk_good', 'sidewalk_poor', 'sidewalk_missing', 'crossing_marked', 'crossing_unmarked', 'street_light', 'no_street_light', 'flood_prone', 'construction_blocked', 'stray_animals', 'bike_lane', 'bike_friendly_road', 'dangerous_intersection', 'bike_parking');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'verified', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "TransitMode" AS ENUM ('jeepney', 'uv_express', 'tricycle', 'bus', 'train');

-- CreateEnum
CREATE TYPE "TransitRouteStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateTable
CREATE TABLE "score_cache" (
    "id" TEXT NOT NULL,
    "grid_cell_id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "resolution" INTEGER NOT NULL,
    "result" JSONB NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "score_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "infrastructure_reports" (
    "id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "type" "ReportType" NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'pending',
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "infrastructure_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_votes" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_confirm" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transit_routes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "TransitMode" NOT NULL,
    "waypoints" JSONB NOT NULL,
    "fare" DOUBLE PRECISION,
    "operating_hours" TEXT,
    "status" "TransitRouteStatus" NOT NULL DEFAULT 'pending',
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transit_routes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "score_cache_grid_cell_id_key" ON "score_cache"("grid_cell_id");

-- CreateIndex
CREATE INDEX "score_cache_lat_lng_idx" ON "score_cache"("lat", "lng");

-- CreateIndex
CREATE INDEX "infrastructure_reports_lat_lng_idx" ON "infrastructure_reports"("lat", "lng");

-- CreateIndex
CREATE INDEX "infrastructure_reports_type_idx" ON "infrastructure_reports"("type");

-- CreateIndex
CREATE INDEX "infrastructure_reports_status_idx" ON "infrastructure_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "report_votes_report_id_user_id_key" ON "report_votes"("report_id", "user_id");

-- CreateIndex
CREATE INDEX "transit_routes_mode_idx" ON "transit_routes"("mode");

-- CreateIndex
CREATE INDEX "transit_routes_status_idx" ON "transit_routes"("status");

-- AddForeignKey
ALTER TABLE "report_votes" ADD CONSTRAINT "report_votes_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "infrastructure_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
