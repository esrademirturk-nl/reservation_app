{# Path of a bronze folder. LAKE_DIR points at <storage>/lake/bronze; default = synthetic sample data. #}
{% macro bronze(path) -%}
  '{{ env_var("LAKE_DIR", "../sample/lake/lake/bronze") }}/{{ path }}'
{%- endmacro %}

{# Latest daily snapshot of an exported table. Columns are declared, so an empty export still has a schema (data contract). #}
{% macro latest_snapshot(table, columns) -%}
  {%- set files = bronze('snapshots/' ~ table ~ '/*/*.jsonl') -%}
  {%- set cols = [] -%}
  {%- for name, type in columns.items() -%}{%- do cols.append("\"" ~ name ~ "\": '" ~ type ~ "'") -%}{%- endfor -%}
  (
    with snap as (
      select * from read_json({{ files }}, hive_partitioning = true, format = 'newline_delimited',
                              columns = { {{ cols | join(', ') }} })
    )
    select * exclude (snapshot_date) from snap
    where snapshot_date = (select max(snapshot_date) from snap)
  )
{%- endmacro %}

{# dbt-duckdb: use the configured schema name as is (staging, silver, gold). #}
{% macro generate_schema_name(custom_schema_name, node) -%}
  {{ custom_schema_name if custom_schema_name else target.schema }}
{%- endmacro %}
