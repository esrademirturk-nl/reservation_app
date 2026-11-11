-- How well bookings are read, per booking type and channel (email / pdf).
-- "corrections per import" = fields the user had to fix, divided by imported bookings: lower is better.
with imported as (
    select booking_type, booking_source,
           count(*)                                          as imports,
           count(*) filter (where reader = 'claude')         as read_by_claude,
           avg(fields_flagged)                               as avg_fields_flagged
    from {{ ref('fct_events') }}
    where event_name = 'booking_imported'
    group by 1, 2
),
corrected as (
    select booking_type, booking_source, count(*) as corrections
    from {{ ref('fct_events') }}
    where event_name = 'booking_field_corrected'
    group by 1, 2
),
confirmed as (
    select booking_type, booking_source,
           median(try_cast(properties ->> 'minutes_since_import' as int)) as median_minutes_to_confirm
    from {{ ref('fct_events') }}
    where event_name = 'booking_confirmed'
    group by 1, 2
)
select
    i.booking_type,
    i.booking_source,
    i.imports,
    round(100.0 * i.read_by_claude / i.imports, 1)             as claude_share_pct,
    round(i.avg_fields_flagged, 2)                              as avg_fields_flagged,
    coalesce(c.corrections, 0)                                  as corrections,
    round(coalesce(c.corrections, 0)::double / i.imports, 2)    as corrections_per_import,
    f.median_minutes_to_confirm
from imported i
left join corrected c using (booking_type, booking_source)
left join confirmed f using (booking_type, booking_source)
order by i.booking_type, i.booking_source
