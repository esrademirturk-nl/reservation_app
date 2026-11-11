select
    reservation_id::uuid           as reservation_id,
    trip_id::uuid                  as trip_id,
    customer_key::uuid             as customer_key,
    type                           as booking_type,
    provider,
    source,
    status,
    start_at::timestamp            as start_at,
    end_at::timestamp              as end_at,
    price_cents::bigint            as price_cents,
    currency,
    guests::int                    as guests,
    created_at::timestamptz        as created_at,
    fields_flagged::int            as fields_flagged
from {{ ref('stg_reservations') }}
where not is_deleted
