import nextEnv from "@next/env";
import postgres from "postgres";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.env.NUVIO_OPS_ENV_DIR || process.cwd());

const databaseUrl =
  process.env.NUVIO_OPS_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.DIRECT_DATABASE_URL;
if (!databaseUrl) throw new Error("A database URL is required.");

const sql = postgres(databaseUrl, {
  connect_timeout: 15,
  idle_timeout: 5,
  max: 1,
  prepare: false,
});

try {
  const rows = await sql.begin(
    "isolation level repeatable read read only",
    async (tx) => {
      await tx`set local statement_timeout = '20s'`;
      return tx`
        with phone_values as (
          select 'profiles'::text as source, phone as value
          from public.profiles
          where coalesce(phone, '') <> ''
          union all
          select 'program_applications'::text, phone
          from public.program_applications
          where coalesce(phone, '') <> ''
        ), classified as (
          select
            source,
            case
              when value ~ '^010[0-9]{8}$' then 'canonical'
              when value ~ '^[0-9 ()+-]+$'
                and regexp_replace(value, '[^0-9]', '', 'g') ~ '^010[0-9]{8}$'
                then 'convertible'
              else 'invalid'
            end as quality
          from phone_values
        )
        select source, quality, count(*)::integer as count
        from classified
        group by source, quality
        order by source, quality
      `;
    },
  );
  process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
} finally {
  await sql.end({ timeout: 5 });
}
