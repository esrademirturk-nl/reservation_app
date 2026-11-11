select
    f.customer_key::uuid   as customer_key,
    f.trip_id::uuid        as trip_id,
    f.item_ref,
    f.action,
    f.at::timestamptz      as at,
    p.category             as place_category,
    p.price_level::int     as place_price_level
from {{ ref('stg_suggestion_feedback') }} f
left join {{ ref('stg_places') }} p on p.place_id = f.item_ref
