-- One row per event (deduplicated), with the properties used most often as columns.
with ranked as (
    select *, row_number() over (partition by event_id order by ingested_at) as n
    from {{ ref('stg_events') }}
)
select
    event_id,
    customer_key,
    event_name,
    schema_version,
    occurred_at,
    cast(occurred_at as date)                          as event_date,
    app,
    properties ->> 'type'                              as booking_type,
    properties ->> 'source'                            as booking_source,
    properties ->> 'reader'                            as reader,
    try_cast(properties ->> 'fields_flagged' as int)   as fields_flagged,
    properties ->> 'field'                             as corrected_field,
    properties ->> 'action'                            as suggestion_action,
    properties ->> 'section'                           as suggestion_section,
    properties ->> 'screen'                            as screen,
    properties
from ranked
where n = 1
