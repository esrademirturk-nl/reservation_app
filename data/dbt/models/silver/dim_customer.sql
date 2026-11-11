-- Pseudonymous customer dimension: no names, no emails — only the customer_key.
select
    c.customer_key::uuid                          as customer_key,
    c.language,
    c.budget_level::int                           as budget_level,
    c.home_city,
    c.signup_date::date                           as signup_date,
    date_trunc('week', c.signup_date::date)::date as signup_week,
    coalesce(k.product_analytics, false)          as consent_product_analytics,
    coalesce(k.personalisation, false)            as consent_personalisation,
    coalesce(k.marketing, false)                  as consent_marketing,
    coalesce(k.ai_processing, false)              as consent_ai_processing,
    p.pace,
    coalesce(p.interests, [])::varchar[]          as interests,
    p.travel_party,
    p.home_airport
from {{ ref('stg_customers') }} c
left join {{ ref('dim_consent_current') }} k on k.customer_key = c.customer_key::uuid
left join {{ ref('stg_preferences') }} p on p.customer_key = c.customer_key
where not c.is_deleted
