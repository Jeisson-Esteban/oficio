-- Esquema mínimo para usar Neon (Postgres) como RecordProvider genérico --
-- un "CRM propio" construido sobre Neon, no una app de terceros.
-- Se aplica con: npx tsx nucleo/cli/preparar-neon.ts

CREATE TABLE IF NOT EXISTS registros (
  id SERIAL PRIMARY KEY,
  tipo TEXT NOT NULL,
  criterio TEXT,
  referencia TEXT,
  datos JSONB NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS registros_tipo_criterio_idx ON registros (tipo, criterio);
CREATE INDEX IF NOT EXISTS registros_tipo_referencia_idx ON registros (tipo, referencia, creado_en DESC);
