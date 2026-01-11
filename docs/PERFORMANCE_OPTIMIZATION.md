# Performance Optimization Guide

This document outlines performance optimizations applied to EstateIQ and recommendations for maintaining query performance as the application scales.

## Index Strategy

### Composite Indexes

We use composite indexes to optimize common query patterns that filter on multiple columns:

1. **Rent Periods** (highest query volume):
   - `(organization_id, status, due_date)` - For status-filtered queries ordered by due date
   - `(organization_id, status, days_overdue DESC)` - For overdue priority sorting
   - `(organization_id, due_date, status)` - For "due today" lookups

2. **Payments**:
   - `(organization_id, paid_at DESC)` - For recent payments listing

3. **Occupancies**:
   - `(organization_id, active_from, active_to)` with partial index for active occupancies

### Index Guidelines

- **Order matters**: Most selective column first, then sort columns
- **DESC NULLS LAST**: Use on sort columns for descending order queries
- **Partial indexes**: Use WHERE clauses to reduce index size for filtered queries
- **Monitor usage**: Review `pg_stat_user_indexes` periodically

## Query Patterns

### High-Frequency Queries

1. **List rent periods by status**:
   ```sql
   SELECT * FROM rent_periods
   WHERE organization_id = $1 AND status = $2
   ORDER BY due_date;
   ```
   **Index**: `idx_rent_periods_org_status_due_date`

2. **Get overdue periods (priority sorted)**:
   ```sql
   SELECT * FROM rent_periods
   WHERE organization_id = $1 AND status = 'OVERDUE' AND days_overdue > 0
   ORDER BY days_overdue DESC;
   ```
   **Index**: `idx_rent_periods_org_status_days_overdue`

3. **Get periods due today**:
   ```sql
   SELECT * FROM rent_periods
   WHERE organization_id = $1 AND due_date = CURRENT_DATE AND status = 'DUE';
   ```
   **Index**: `idx_rent_periods_org_due_date_status`

4. **List recent payments**:
   ```sql
   SELECT * FROM payments
   WHERE organization_id = $1
   ORDER BY paid_at DESC;
   ```
   **Index**: `idx_payments_org_paid_at`

## Deep Join Queries

Queries that join through multiple tables (e.g., `rent_periods -> rent_configs -> occupancies -> units -> buildings`) benefit from:

1. Foreign key indexes (automatic in PostgreSQL)
2. Composite indexes on `(organization_id, foreign_key_id)` for org-scoped joins
3. Ensuring join columns are indexed

## Performance Monitoring

### Check Index Usage

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Analyze Slow Queries

```sql
EXPLAIN ANALYZE
SELECT * FROM rent_periods
WHERE organization_id = '...' AND status = 'OVERDUE'
ORDER BY days_overdue DESC;
```

### Vacuum and Analyze

Run periodically (especially after bulk operations):

```sql
VACUUM ANALYZE rent_periods;
VACUUM ANALYZE payments;
```

## Query Optimization Best Practices

1. **Always filter by `organization_id` first** - This is the most selective filter
2. **Use specific status filters** - Avoid `IN ('DUE', 'OVERDUE')` when possible
3. **Limit result sets** - Use pagination for large datasets
4. **Avoid N+1 queries** - Use Supabase's nested select syntax for joins
5. **Monitor query plans** - Use EXPLAIN ANALYZE on new queries

## Future Optimizations

As data grows, consider:

1. **Partitioning**: Partition `rent_periods` by `organization_id` or date ranges
2. **Materialized views**: For complex reporting queries
3. **Query result caching**: For frequently accessed, rarely-changing data
4. **Connection pooling**: Use PgBouncer or Supabase connection pooling

## Migration Applied

See `supabase/migrations/012_performance_indexes.sql` for the complete index migration.

