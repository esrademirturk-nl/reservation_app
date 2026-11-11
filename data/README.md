# Data pipeline (silver & gold)

dbt project that turns the **bronze** files exported by the API (`apps/api/src/lake`) into a pseudonymous customer 360, personalisation features and KPIs. Design: [docs/DATA-ARCHITECTURE.md](../docs/DATA-ARCHITECTURE.md).

```
apps/api  ──(outbox shipper, daily snapshots)──►  lake/bronze/*.jsonl  ──(dbt)──►  silver  ──►  gold
```

Locally and in CI the models run on **DuckDB**, which reads the JSON Lines files directly — no warehouse needed. In production the same SQL runs on Databricks (`dbt-databricks`) over ADLS Gen2.

## Run it

```bash
pip install dbt-duckdb

# 1. synthetic bronze data (300 customers, same format as the API export, fixed seed)
python data/sample/generate_lake.py

# 2. build and test everything
cd data/dbt
dbt build --profiles-dir .

# or on a real export from the API (npm run lake:ship && npm run lake:snapshot)
LAKE_DIR=../../apps/api/storage/lake/bronze dbt build --profiles-dir .
```

Look at the results:

```bash
python -c "import duckdb; print(duckdb.connect('data/dbt/target/waypad.duckdb').sql('select * from gold.kpi_signup_funnel'))"
```

## Models

| Layer | Model | What it is |
|---|---|---|
| staging | `stg_events`, `stg_<table>` | bronze files with declared column types (the data contract); latest snapshot only |
| silver | `fct_events` | one row per event, **deduplicated** on `event_id` (the shipper may deliver twice) |
| silver | `dim_customer`, `dim_consent_current` | pseudonymous customer with current consents and stated preferences |
| silver | `fct_trips`, `fct_reservations`, `fct_suggestion_feedback` | typed business facts (nights, lead time, place category) |
| gold | `customer_360` | one row per customer: profile, consents, preferences, trips, bookings, spend, engagement |
| gold | `customer_features_daily` | personalisation features + segment — **only customers who allowed personalisation**; same columns as the `user_features` table the API reads (Phase 2: reverse ETL) |
| gold | `kpi_signup_funnel` | sign-up → onboarding → first trip → first import within 7 days, by week |
| gold | `kpi_import_accuracy` | imports, flagged fields, corrections per import, time to confirm — by booking type and channel |
| gold | `kpi_suggestion_acceptance` | shown / accepted / dismissed / not for me, by section and position |

## Tests (run by `dbt build`)

Unique and not-null keys, accepted values, relationships between facts and customers, no negative prices or nights, and a privacy guard that fails if an email address appears in gold. 48 nodes in total.

## Privacy

- Bronze contains only the `customer_key` pseudonym — no names, emails, booking titles, references or addresses (the API never exports them).
- Trips, bookings, preferences and feedback exist only for customers who allowed product analytics; personalisation features only for customers who allowed personalisation. Withdrawing consent removes the customer from `customer_features_daily` at the next run.
- Erasure (Phase 2): deleting a user deletes the `customer_key`, then the erasure job removes that key's rows from bronze.
