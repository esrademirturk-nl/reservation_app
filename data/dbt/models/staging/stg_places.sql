select * from {{ latest_snapshot('places', {'place_id': 'varchar', 'city': 'varchar', 'category': 'varchar', 'rank': 'integer', 'price_level': 'integer', 'visit_minutes': 'integer'}) }}
