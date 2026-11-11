-- Raw outbox events, typed. Duplicates (shipper retries) are removed in silver.
select
    event_id::uuid                       as event_id,
    customer_key::uuid                   as customer_key,
    event_name,
    schema_version::int                  as schema_version,
    occurred_at::timestamptz             as occurred_at,
    ingested_at::timestamptz             as ingested_at,
    properties,
    context ->> 'app'                    as app,
    context ->> 'consent_version'        as consent_version,
    ingest_date::date                    as ingest_date
from read_json(
    {{ bronze('events/*/*.jsonl') }},
    hive_partitioning = true,
    format = 'newline_delimited',
    columns = {
        event_id: 'varchar', customer_key: 'varchar', event_name: 'varchar', schema_version: 'integer',
        occurred_at: 'varchar', ingested_at: 'varchar', properties: 'json', context: 'json'
    }
)
