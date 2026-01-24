# Data Collection Project

A comprehensive data collection framework for automated data ingestion, validation, storage, and export. This repository provides tools, scripts, and configuration for reliably collecting data from multiple sources (APIs, web scraping, sensors, and manual uploads), processing and validating it, and storing it in secure, versioned datasets.

Table of Contents
- Project overview
- Features
- Technology stack
- Quick start
  - Prerequisites
  - Installation
  - Configuration
  - Running collectors
- Data model & format
- Validation & quality checks
- Storage & retention
- Scheduling & orchestration
- Monitoring & logging
- Development
  - Project structure
  - Running tests
  - Adding a new collector
- Security, privacy & compliance
- Contribution guidelines
- License
- Contact

## Project overview

This project is designed to standardize and automate the lifecycle of data collection for downstream analytics and ML tasks. It focuses on modular collectors, robust validation, schema enforcement, and reproducible dataset management.

## Features

- Pluggable collectors for different sources (REST APIs, FTP, S3, web pages, sensor feeds, and CSV uploads)
- Config-driven pipelines (YAML/JSON) for collectors and transforms
- Schema-driven validation with clear, reportable errors
- Versioned dataset storage and easy export (Parquet/CSV) for downstream systems
- Scheduling and orchestration helpers (Airflow/Prefect examples)
- Monitoring, alerting, and audit logs
- Local development environment and CI configuration

## Technology stack

- Language: Python 3.10+
- Data processing: pandas, pyarrow
- Validation: pydantic, great_expectations (optional)
- Orchestration: Airflow / Prefect (examples)
- Storage: Local filesystem / S3-compatible object stores
- Containerization: Docker
- CI: GitHub Actions

## Quick start

### Prerequisites

- Python 3.10+
- git
- Docker (optional, recommended for consistent development)
- Access keys for any external data sources (APIs, S3)

### Installation

1. Clone the repo:

```bash
git clone https://github.com/YuvalAlt1/DataCollectionProject.git
cd DataCollectionProject
```

2. Create and activate a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate  # macOS / Linux
.\.venv\Scripts\activate   # Windows
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

### Configuration

All collectors and pipelines are driven through config files in the `configs/` directory. A single config file controls source connection details, schedule, output path, schema, and validation rules.

Example config (configs/example_collector.yaml):

````yaml
name: example_api
type: api
schedule: "@daily"
source:
  base_url: "https://api.example.com"
  api_key_env: "EXAMPLE_API_KEY"
output:
  format: parquet
  path: data/example_api/{{ds}}/
schema:
  - name: id
    type: integer
  - name: timestamp
    type: datetime
  - name: value
    type: float
validation:
  required_fields: [id, timestamp]
  unique_keys: [id]
````

### Running collectors

There are multiple entry points depending on the use-case:

- CLI: `python -m collectors.run --config configs/example_collector.yaml --date 2026-01-01`
- Docker: Build and run the included Dockerfile for a consistent runtime
- Scheduler: Use the provided Airflow or Prefect example DAGs to schedule and orchestrate collectors

Example CLI:

```bash
# run single collector for a specific date
python -m collectors.run --config configs/example_collector.yaml --date 2026-01-01
```

## Data model & format

Primary storage format is Parquet for efficient columnar storage and compatibility with analytics tools. All datasets include a minimal metadata file (YAML/JSON) in the output folder with:

- schema
- collector version
- source connection (masked)
- extraction timestamp
- validation summary

## Validation & quality checks

Validation happens in multiple stages:

1. Source-level sanity checks (connectivity, auth)
2. Schema validation (types, required fields)
3. Row-level checks (nulls, ranges, uniqueness)
4. Aggregated checks (row counts, delta checks vs previous run)

Validation failures are written to `logs/validation/` and will cause non-zero exit codes in CI or when run with `--fail-on-error`.

## Storage & retention

By default data is stored under `data/` with the layout:

```
data/<collector_name>/YYYY-MM-DD/
  - part-0000.parquet
  - metadata.json
  - validation_report.json
```

Configure retention in `configs/retention.yaml` to automatically prune older partitions or move them to cold storage.

## Scheduling & orchestration

This repo contains example DAGs for Airflow (`orchestration/airflow/`) and flows for Prefect (`orchestration/prefect/`). These examples show how to:

- schedule daily/weekly collectors
- run dependency-aware pipelines
- perform backfills and catchups

## Monitoring & logging

- Collectors use structured JSON logging; logs are persisted under `logs/` and can be shipped to ELK or a logging service.
- Metrics (run time, rows extracted, validation errors) are emitted to a Prometheus exporter example in `monitoring/`.
- Alerts can be configured using webhooks or email notifications when important validations fail.

## Development

### Project structure

````text
DataCollectionProject/
├─ collectors/            # collector implementations and entrypoints
├─ configs/               # YAML config files for collectors and retention
├─ transforms/            # data transformation utilities
├─ schemas/               # canonical schemas (YAML/JSON) and pydantic models
├─ orchestration/         # examples for Airflow / Prefect
├─ monitoring/            # metrics & alerting helpers
├─ tests/                 # unit and integration tests
├─ docker/                # Dockerfiles and compose configs
├─ scripts/               # helper scripts (ingest, backfill, export)
└─ README.md
````

### Running tests

Run unit tests with pytest:

```bash
pytest -q
```

Use tox or GitHub Actions for matrix testing across Python versions.

### Adding a new collector

1. Create a new collector module under `collectors/` implementing the Collector interface:

````python
class BaseCollector(Protocol):
    name: str
    def extract(self, date: date) -> pd.DataFrame: ...
    def validate(self, df: pd.DataFrame) -> ValidationReport: ...
    def persist(self, df: pd.DataFrame, path: str) -> None: ...
````

2. Add a config file to `configs/` describing credentials, schedule, schema, and output
3. Add an Airflow/Prefect task if you want to schedule it
4. Add unit tests under `tests/` and update CI if necessary

## Security, privacy & compliance

- Secrets must be supplied via environment variables or a secrets manager. Do NOT hardcode credentials in configs.
- PII handling rules: Mask or hash sensitive fields before storage. See `security/PII.md` for project-specific policies.
- Logging: Avoid logging raw sensitive values. Use redaction utilities provided in `scripts/redact_logs.py`.
- Data access: Use IAM policies or bucket-level ACLs to restrict who can read datasets.

## Contribution guidelines

Contributions are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-collector`
3. Run tests and linters locally
4. Open a PR describing your change and link any relevant issue

See `CONTRIBUTING.md` for more details and code style guidelines.

## License

This project is distributed under the MIT License. See LICENSE for details.

## Contact

For questions or support, open an issue or contact the maintainer: YuvalAlt1 (https://github.com/YuvalAlt1)

## Changelog

See `CHANGELOG.md` for release notes and version history.