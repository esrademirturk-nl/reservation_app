select * from {{ latest_snapshot('customers', {'customer_key': 'varchar', 'language': 'varchar', 'budget_level': 'integer', 'home_city': 'varchar', 'signup_date': 'date', 'is_deleted': 'boolean'}) }}
