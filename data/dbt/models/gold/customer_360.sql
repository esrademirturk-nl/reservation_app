-- One row per customer: who they are (pseudonymously), what they told us, what they did.
with trips as (
    select
        customer_key,
        count(*)                                                    as trips_total,
        count(*) filter (where start_date >= current_date)          as trips_upcoming,
        count(distinct country_code)                                as countries,
        avg(nights)                                                 as avg_trip_nights,
        median(lead_time_days)                                      as median_lead_time_days,
        min(created_at)                                             as first_trip_at,
        mode(city)                                                  as favourite_city
    from {{ ref('fct_trips') }}
    group by 1
),
bookings as (
    select
        r.customer_key,
        count(*) filter (where r.status <> 'cancelled')                              as bookings_total,
        count(*) filter (where r.source in ('email', 'pdf'))                         as bookings_imported,
        sum(r.price_cents) filter (where r.status <> 'cancelled')                    as spend_cents,
        sum(r.price_cents) filter (where r.status <> 'cancelled' and r.booking_type = 'hotel') as hotel_spend_cents,
        mode(r.provider) filter (where r.booking_type = 'flight')                    as favourite_airline
    from {{ ref('fct_reservations') }} r
    group by 1
),
hotel_nights as (
    select customer_key, sum(nights) as nights
    from {{ ref('fct_trips') }}
    group by 1
),
activity as (
    select
        customer_key,
        count(*)                                                              as events_total,
        count(*) filter (where event_name = 'booking_field_corrected')        as corrections,
        count(*) filter (where event_name = 'suggestion_feedback'
                         and suggestion_action = 'accepted')                  as suggestions_accepted,
        count(*) filter (where event_name = 'suggestion_feedback'
                         and suggestion_action = 'shown')                     as suggestions_shown,
        max(occurred_at)                                                      as last_active_at
    from {{ ref('fct_events') }}
    group by 1
),
liked as (
    select customer_key, list(distinct place_category order by place_category) as liked_categories
    from {{ ref('fct_suggestion_feedback') }}
    where action = 'accepted' and place_category is not null
    group by 1
)
select
    c.customer_key,
    c.language,
    c.budget_level,
    c.signup_date,
    c.consent_product_analytics,
    c.consent_personalisation,
    c.consent_marketing,
    c.pace,
    c.interests,
    c.travel_party,
    coalesce(t.trips_total, 0)                                  as trips_total,
    coalesce(t.trips_upcoming, 0)                               as trips_upcoming,
    coalesce(t.countries, 0)                                    as countries,
    t.avg_trip_nights,
    t.median_lead_time_days,
    t.favourite_city,
    coalesce(b.bookings_total, 0)                               as bookings_total,
    coalesce(b.bookings_imported, 0)                            as bookings_imported,
    coalesce(b.spend_cents, 0)                                  as spend_cents,
    case when hn.nights > 0 then round(b.hotel_spend_cents / hn.nights)::bigint end as avg_spend_per_night_cents,
    b.favourite_airline,
    coalesce(a.events_total, 0)                                 as events_total,
    coalesce(a.corrections, 0)                                  as import_corrections,
    coalesce(a.suggestions_shown, 0)                            as suggestions_shown,
    coalesce(a.suggestions_accepted, 0)                         as suggestions_accepted,
    coalesce(l.liked_categories, [])                            as liked_categories,
    a.last_active_at,
    -- trips per year since sign-up (at least 30 days, so new users are not extrapolated wildly)
    round(coalesce(t.trips_total, 0) * 365.0 / greatest(30, datediff('day', c.signup_date, current_date)), 2) as trips_per_year
from {{ ref('dim_customer') }} c
left join trips t        on t.customer_key = c.customer_key
left join bookings b     on b.customer_key = c.customer_key
left join hotel_nights hn on hn.customer_key = c.customer_key
left join activity a     on a.customer_key = c.customer_key
left join liked l        on l.customer_key = c.customer_key
