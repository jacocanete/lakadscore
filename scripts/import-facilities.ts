import { Client } from "pg"
import { readFileSync } from "fs"
import { join } from "path"

const FACILITY_FILES: { file: string; category: string }[] = [
  { file: "police_stations.geojson", category: "police" },
  { file: "fire_stations.geojson", category: "fire_station" },
  { file: "hospitals.geojson", category: "hospital" },
  { file: "schools.geojson", category: "school" },
]

const PH_BOUNDS = {
  minLng: 116.0,
  maxLng: 127.0,
  minLat: 4.5,
  maxLat: 21.5,
}

function isInPhilippines(lng: number, lat: number): boolean {
  return (
    lng >= PH_BOUNDS.minLng &&
    lng <= PH_BOUNDS.maxLng &&
    lat >= PH_BOUNDS.minLat &&
    lat <= PH_BOUNDS.maxLat
  )
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is required")
  }

  const client = new Client({ connectionString })
  await client.connect()

  console.log("Creating facilities table...")
  await client.query(`
    DROP TABLE IF EXISTS facilities;
    CREATE TABLE facilities (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL,
      name TEXT,
      geom GEOMETRY(Point, 4326) NOT NULL
    );
  `)

  const dataDir = join(new URL(".", import.meta.url).pathname, "data")
  let totalInserted = 0

  for (const { file, category } of FACILITY_FILES) {
    const path = join(dataDir, file)
    const raw = readFileSync(path, "utf8")
    const geojson = JSON.parse(raw)
    const features = geojson.features as {
      properties: { name?: string | null }
      geometry: { coordinates: [number, number] }
    }[]

    const filtered = features.filter((f) => {
      const [lng, lat] = f.geometry.coordinates
      return isInPhilippines(lng, lat)
    })

    console.log(
      `${category}: ${filtered.length}/${features.length} features (filtered to PH bounds)`
    )

    const BATCH_SIZE = 500
    for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
      const batch = filtered.slice(i, i + BATCH_SIZE)
      const values: string[] = []
      const params: (string | null)[] = []

      for (let j = 0; j < batch.length; j++) {
        const f = batch[j]
        const [lng, lat] = f.geometry.coordinates
        const paramOffset = j * 2
        values.push(
          `($${paramOffset + 1}, $${paramOffset + 2}, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))`
        )
        params.push(category, f.properties.name ?? null)
      }

      await client.query(
        `INSERT INTO facilities (category, name, geom) VALUES ${values.join(", ")}`,
        params
      )
    }

    totalInserted += filtered.length
  }

  console.log(`\nCreating spatial index...`)
  await client.query(
    `CREATE INDEX facilities_geom_idx ON facilities USING GIST (geom) WITH (fillfactor=100)`
  )
  await client.query(
    `CREATE INDEX facilities_category_idx ON facilities (category)`
  )

  console.log(`Done. Inserted ${totalInserted} facilities.`)
  await client.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
