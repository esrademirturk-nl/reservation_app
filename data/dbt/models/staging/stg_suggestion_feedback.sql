select * from {{ latest_snapshot('suggestion_feedback', {'customer_key': 'varchar', 'trip_id': 'varchar', 'item_ref': 'varchar', 'action': 'varchar', 'at': 'varchar'}) }}
