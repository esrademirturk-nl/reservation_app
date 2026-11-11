{# Generic test: no negative values (kept here so the project needs no packages). #}
{% test dbt_utils_free_non_negative(model, column_name) %}
select * from {{ model }} where {{ column_name }} < 0
{% endtest %}

{# Privacy guard: fail if a column looks like it contains an email address. #}
{% test no_email_addresses(model, column_name) %}
select * from {{ model }} where cast({{ column_name }} as varchar) like '%@%.%'
{% endtest %}
