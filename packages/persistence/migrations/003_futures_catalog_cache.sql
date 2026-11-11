-- Durable T-Invest futures catalog snapshot for chart listing fallback
-- (serve on InstrumentsService/Futures RESOURCE_EXHAUSTED; refresh on success).

CREATE TABLE futures_catalog_cache (
  provider TEXT NOT NULL CHECK (provider IN ('t-invest')),
  provider_instrument_id TEXT NOT NULL,
  ticker TEXT NOT NULL,
  name TEXT NOT NULL,
  class_code TEXT,
  sector TEXT NOT NULL DEFAULT '',
  asset_type_raw TEXT,
  basic_asset TEXT,
  contract_family TEXT,
  expiration_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  list_category TEXT NOT NULL CHECK (
    list_category IN ('commodity', 'equity_index', 'currency', 'share', 'other')
  ),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, provider_instrument_id)
);

CREATE INDEX futures_catalog_cache_category_idx
  ON futures_catalog_cache (provider, list_category, is_active, contract_family, expiration_at);

CREATE INDEX futures_catalog_cache_sector_idx
  ON futures_catalog_cache (provider, sector);
