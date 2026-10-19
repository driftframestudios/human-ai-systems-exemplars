-- TARGET: legacy data movement starts each Flyway connection with the reviewed
-- isolation default while the grouped V002-V004 transaction stays atomic.

set default_transaction_isolation to 'repeatable read';
