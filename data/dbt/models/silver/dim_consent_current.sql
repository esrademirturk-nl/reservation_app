-- Current consent per customer and purpose (latest record wins), one row per customer.
with latest as (
    select customer_key::uuid as customer_key, purpose, granted, recorded_at::timestamptz as recorded_at,
           row_number() over (partition by customer_key, purpose order by recorded_at::timestamptz desc) as n
    from {{ ref('stg_consents') }}
)
select
    customer_key,
    bool_or(granted) filter (where purpose = 'product_analytics') as product_analytics,
    bool_or(granted) filter (where purpose = 'personalisation')   as personalisation,
    bool_or(granted) filter (where purpose = 'marketing')         as marketing,
    bool_or(granted) filter (where purpose = 'ai_processing')     as ai_processing,
    max(recorded_at)                                              as last_changed_at
from latest
where n = 1
group by customer_key
