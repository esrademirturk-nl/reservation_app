select
    trip_id::uuid                                        as trip_id,
    customer_key::uuid                                   as customer_key,
    city,
    country_code,
    start_date::date                                     as start_date,
    end_date::date                                       as end_date,
    datediff('day', start_date::date, end_date::date)    as nights,
    travelers::int                                       as travelers,
    created_at::timestamptz                              as created_at,
    datediff('day', cast(created_at::timestamptz as date), start_date::date) as lead_time_days
from {{ ref('stg_trips') }}
where not is_deleted
