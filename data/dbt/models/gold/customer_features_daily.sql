-- Personalisation features — only for customers who allowed personalisation.
-- Loaded back into PostgreSQL (user_features) in Phase 2.
with base as (
    select * from {{ ref('customer_360') }}
    where consent_personalisation
),
categories as (
    -- stated interests mapped to place categories, plus categories the customer accepted
    select
        customer_key,
        list_distinct(list_concat(
            liked_categories,
            [case i when 'food' then 'food' when 'local_life' then 'food'
                    when 'museums' then 'museum' when 'art' then 'museum'
                    when 'history' then 'sight' when 'architecture' then 'sight'
                    when 'nature' then 'walk' when 'nightlife' then 'walk' end
             for i in interests if i in ('food','local_life','museums','art','history','architecture','nature','nightlife')]
        )) as top_categories
    from base
)
select
    b.customer_key,
    b.trips_per_year,
    round(b.avg_trip_nights, 2)                     as avg_trip_nights,
    b.avg_spend_per_night_cents,
    b.median_lead_time_days::int                    as median_lead_time_days,
    list_sort(c.top_categories)                     as top_categories,
    case
        when b.travel_party = 'family'                                                  then 'family_traveller'
        when b.budget_level = 1                                                         then 'budget_traveller'
        when b.trips_per_year >= 4 and coalesce(b.avg_trip_nights, 99) <= 3              then 'city_breaker'
        when list_has_any(b.interests, ['history', 'art', 'museums', 'architecture'])    then 'culture_lover'
        when list_has_any(b.interests, ['food', 'local_life', 'nightlife'])             then 'food_and_local_life'
        else 'explorer'
    end                                              as segment,
    current_timestamp                                as computed_at
from base b
join categories c using (customer_key)
