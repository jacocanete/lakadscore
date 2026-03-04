#!/bin/sh
set -e

echo "Running Prisma migrations..."
bunx prisma migrate deploy

echo "Starting LakadScore API..."
exec bun run src/server.ts
