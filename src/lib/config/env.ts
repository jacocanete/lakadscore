import { z } from "zod"

const envSchema = z.object({
  GOOGLE_MAPS_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  SCORE_CACHE_TTL_DAYS: z.coerce.number().default(90),
  GRID_RESOLUTION_METERS: z.coerce.number().default(100),
  MAX_AMENITY_RADIUS_METERS: z.coerce.number().default(2400),
  RATE_LIMIT_RPM: z.coerce.number().default(30),
  LAKADSCORE_API_KEY: z.string().min(1),
  PORT: z.coerce.number().default(3001),
})

export type Env = z.infer<typeof envSchema>

let _env: Env | null = null

export function getEnv(): Env {
  if (_env) return _env

  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n")
    throw new Error(`Missing or invalid environment variables:\n${missing}`)
  }

  _env = parsed.data
  return _env
}
