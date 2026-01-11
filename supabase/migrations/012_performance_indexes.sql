-- Performance Optimization: Additional Indexes for Common Query Patterns
-- Phase 5: Performance hardening
--
-- This migration adds composite indexes to optimize frequently executed queries,
-- particularly for reporting and follow-up workflows that filter and sort on
-- multiple columns.

-- ============================================================================
-- RENT PERIODS: High-frequency queries
-- ============================================================================

-- Query pattern: Filter by org + status + order by due_date
-- Used in: listRentPeriods, getDueTodayRentPeriods, reports
-- Example: .eq('organization_id', X).eq('status', 'DUE').order('due_date')
CREATE INDEX IF NOT EXISTS idx_rent_periods_org_status_due_date 
  ON rent_periods(organization_id, status, due_date);

-- Query pattern: Filter by org + status + order by days_overdue DESC
-- Used in: getOverdueRentPeriods, follow-up queue (priority sorting)
-- Example: .eq('organization_id', X).eq('status', 'OVERDUE').order('days_overdue', { ascending: false })
CREATE INDEX IF NOT EXISTS idx_rent_periods_org_status_days_overdue 
  ON rent_periods(organization_id, status, days_overdue DESC NULLS LAST);

-- Query pattern: Filter by org + due_date (exact match) + status
-- Used in: getDueTodayRentPeriods (due_date = today, status = 'DUE')
-- Example: .eq('organization_id', X).eq('due_date', today).eq('status', 'DUE')
CREATE INDEX IF NOT EXISTS idx_rent_periods_org_due_date_status 
  ON rent_periods(organization_id, due_date, status);

-- Query pattern: Filter by org + status IN ('DUE', 'OVERDUE') + order by due_date
-- Used in: getUnpaidRentPeriodsByBuilding, getBuildingRollups, reports
-- Example: .eq('organization_id', X).in('status', ['DUE', 'OVERDUE']).order('due_date')
-- Note: The existing idx_rent_periods_org_status_due_date covers this pattern

-- ============================================================================
-- PAYMENTS: Lookup and reporting queries
-- ============================================================================

-- Query pattern: Filter by org + order by paid_at DESC (recent payments first)
-- Used in: listPayments (default ordering)
-- Example: .eq('organization_id', X).order('paid_at', { ascending: false })
CREATE INDEX IF NOT EXISTS idx_payments_org_paid_at 
  ON payments(organization_id, paid_at DESC NULLS LAST);

-- ============================================================================
-- OCCUPANCIES: Active occupancy lookups
-- ============================================================================

-- Query pattern: Filter by org + check active date ranges
-- Used in: listOccupancies (filtering active occupancies)
-- Note: Partial index for open-ended occupancies (active_to IS NULL)
-- This helps queries that check for "currently active" occupancies
-- For date-range filtering, the composite index on (organization_id, active_from, active_to) 
-- will be used, and queries can filter by active_to >= CURRENT_DATE in the WHERE clause
CREATE INDEX IF NOT EXISTS idx_occupancies_org_active_open 
  ON occupancies(organization_id, active_from) 
  WHERE active_to IS NULL;

-- ============================================================================
-- RENT CONFIGS: Join optimization
-- ============================================================================

-- Query pattern: Join rent_configs -> occupancies -> units -> buildings
-- Used in: Deep nested queries in follow-ups, reports
-- Note: The existing idx_rent_configs_occupancy_id should help, but we ensure
-- the join path is optimized. This composite index helps when filtering by org
-- and joining to occupancies.
-- (Already exists: idx_rent_configs_org_occupancy covers this)

-- ============================================================================
-- UNITS: Building-level queries
-- ============================================================================

-- Query pattern: Filter units by building_id (reverse of existing index)
-- Used in: listUnits with building filter
-- Note: Existing idx_units_org_building covers (organization_id, building_id)
-- Adding reverse for queries that filter by building_id first
CREATE INDEX IF NOT EXISTS idx_units_building_org 
  ON units(building_id, organization_id);

-- ============================================================================
-- NOTES ON QUERY OPTIMIZATION
-- ============================================================================
--
-- 1. Composite indexes are ordered: most selective first, then sort columns
-- 2. DESC NULLS LAST on sort columns helps with descending order queries
-- 3. Partial indexes (WHERE clauses) reduce index size for filtered queries
-- 4. Foreign key columns are automatically indexed, but composite indexes
--    on (org_id, fk_id) help with org-scoped joins
--
-- MONITORING RECOMMENDATIONS:
-- - Use EXPLAIN ANALYZE on slow queries to verify index usage
-- - Monitor index usage with: SELECT * FROM pg_stat_user_indexes
-- - Consider VACUUM ANALYZE after large data changes
-- - Review query plans periodically as data grows

