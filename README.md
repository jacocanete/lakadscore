# LakadScore

Walkability, transit, and bike scoring API for the Philippines. A WalkScore alternative built for locations that WalkScore doesn't cover.

## Scores

- **LakadScore** — walkability based on nearby amenities (proximity, density, choice, coverage)
- **Commute Score** — transit accessibility using Google transit stops + OSM road proximity (jeepney proxy)
- **Bike Score** — bikeability from OSM road infrastructure, hill grade, and nearby destinations

## Stack

- **Bun** runtime with `Bun.serve()`
- **PostgreSQL + PostGIS** for spatial queries and caching
- **Prisma 7** ORM with `@prisma/adapter-pg`
- **Google Places API (New)** + **Google Elevation API** for POI and terrain data
- **OSM** road data for transit and bike infrastructure scoring

## Setup

```bash
cp .env.example .env.local  # fill in GOOGLE_MAPS_API_KEY, LAKADSCORE_API_KEY

# start postgres (postgis/postgis:16-3.4-alpine on port 5433)
docker start lakadscore_db

# install deps and run migrations
bun install
bun run db:migrate

# start the server
bun run dev
```

## API

All endpoints require `X-API-Key` header (except health).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/score?lat=&lng=` | Compute all three scores for a location |
| `GET` | `/api/report?lat=&lng=&radius_km=` | Get nearby infrastructure reports |
| `POST` | `/api/report` | Submit an infrastructure report |
| `POST` | `/api/report/vote` | Vote on a report |
| `GET` | `/api/transit-routes` | List transit routes |
| `POST` | `/api/transit-routes` | Add a transit route |
| `PATCH` | `/api/transit-routes` | Confirm a transit route |
| `GET` | `/api/health` | Server and DB status |

## Example

```bash
curl -H "X-API-Key: $LAKADSCORE_API_KEY" \
  "http://localhost:3001/api/score?lat=14.5995&lng=120.9842"
```
