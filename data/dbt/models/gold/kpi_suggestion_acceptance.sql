-- Suggestion performance per section and position.
select
    suggestion_section                                                     as section,
    try_cast(properties ->> 'rank_position' as int)                        as rank_position,
    count(*) filter (where suggestion_action = 'shown')                    as shown,
    count(*) filter (where suggestion_action = 'accepted')                 as accepted,
    count(*) filter (where suggestion_action = 'dismissed')                as dismissed,
    count(*) filter (where suggestion_action = 'not_for_me')               as not_for_me,
    round(100.0 * count(*) filter (where suggestion_action = 'accepted')
          / nullif(count(*) filter (where suggestion_action = 'shown'), 0), 1) as acceptance_pct
from {{ ref('fct_events') }}
where event_name = 'suggestion_feedback'
group by 1, 2
order by 1, 2
