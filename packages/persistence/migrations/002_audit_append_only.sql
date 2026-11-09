-- BL-023: keep audit_log append-only for the application DB role when present.
-- UPDATE/DELETE are revoked; SELECT/INSERT remain for reads and appends.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'moex_app') THEN
    REVOKE UPDATE, DELETE ON TABLE audit_log FROM moex_app;
    GRANT SELECT, INSERT ON TABLE audit_log TO moex_app;
    GRANT USAGE, SELECT ON SEQUENCE audit_log_id_seq TO moex_app;
  END IF;
END
$$;
