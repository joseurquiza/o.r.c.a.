-- Store apps as worker templates: lineage from submission/app/version → worker
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS source_app_id uuid REFERENCES store_apps(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_app_version_id uuid REFERENCES store_app_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_submission_id uuid REFERENCES store_submissions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS workers_source_app_id_idx ON workers(source_app_id);
CREATE INDEX IF NOT EXISTS workers_source_app_version_id_idx ON workers(source_app_version_id);
