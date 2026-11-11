select * from {{ latest_snapshot('consents', {'customer_key': 'varchar', 'purpose': 'varchar', 'granted': 'boolean', 'text_version': 'varchar', 'source': 'varchar', 'recorded_at': 'varchar'}) }}
