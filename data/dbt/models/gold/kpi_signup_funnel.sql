-- Activation funnel by sign-up week: sign-up → onboarding → first trip → first imported booking within 7 days.
with steps as (
    select
        c.customer_key,
        c.signup_week,
        c.signup_date,
        c.consent_product_analytics,
        min(e.occurred_at) filter (where e.event_name = 'onboarding_completed') as onboarded_at,
        min(e.occurred_at) filter (where e.event_name = 'trip_created')         as first_trip_at,
        min(e.occurred_at) filter (where e.event_name = 'booking_imported')     as first_import_at
    from {{ ref('dim_customer') }} c
    left join {{ ref('fct_events') }} e on e.customer_key = c.customer_key
    group by 1, 2, 3, 4
)
select
    signup_week,
    count(*)                                                                    as signups,
    count(*) filter (where consent_product_analytics)                           as tracked_signups,
    round(100.0 * count(*) filter (where consent_product_analytics) / count(*), 1) as analytics_consent_pct,
    count(onboarded_at)                                                         as onboarded,
    count(first_trip_at)                                                        as created_trip,
    count(*) filter (where first_import_at < signup_date + interval 7 day)      as imported_within_7_days,
    -- activation rate is measured on tracked customers only (others have no events)
    round(100.0 * count(*) filter (where first_import_at < signup_date + interval 7 day)
          / nullif(count(*) filter (where consent_product_analytics), 0), 1)    as activation_pct
from steps
group by 1
order by 1
