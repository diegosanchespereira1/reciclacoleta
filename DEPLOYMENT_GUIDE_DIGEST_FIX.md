# Deployment Guide: PostgreSQL Digest Fix

## Overview
This guide helps deploy the fix for the PostgreSQL `digest()` function error that occurs when approving collections.

## Pre-Deployment Checklist

- [ ] Review all changes in the PR
- [ ] Ensure PostgreSQL version supports pgcrypto extension (9.1+)
- [ ] Backup production database
- [ ] Plan for maintenance window (migration is quick but safety first)
- [ ] Notify users of potential brief downtime
- [ ] Have rollback plan ready

## Deployment Steps

### Step 1: Backup Database (CRITICAL)

```bash
# For Docker PostgreSQL
docker exec recicla-postgres pg_dump -U recicla_user recicla_db > backup_$(date +%Y%m%d_%H%M%S).sql

# For standalone PostgreSQL
pg_dump -U recicla_user recicla_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Pull Latest Code

```bash
cd /path/to/reciclacoleta
git checkout main
git pull origin main

# Or if deploying from branch
git pull origin copilot/fix-postgresql-digest-error
```

### Step 3: Install Dependencies (if needed)

```bash
cd backend
npm install
```

### Step 4: Apply Database Migration

```bash
cd backend

# Option 1: Using Prisma (recommended)
npx prisma migrate deploy

# Option 2: Manual SQL execution (if Prisma not available)
# psql -U recicla_user -d recicla_db -f prisma/migrations/20251031_enable_pgcrypto_and_fix_digest/migration.sql
```

**Expected Output:**
```
✔ Database schema is up to date!
```

If you see any errors, STOP and review before proceeding.

### Step 5: Verify Migration

Connect to database and verify:

```sql
-- Check pgcrypto extension
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- Check trigger function exists
SELECT proname FROM pg_proc WHERE proname = 'auto_credit_on_completion';

-- Check trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_auto_credit_on_completion';
```

All three queries should return results.

### Step 6: Restart Backend

```bash
# For Docker
docker restart recicla-backend

# For PM2
pm2 restart backend

# For systemd
sudo systemctl restart reciclacoleta-backend
```

### Step 7: Verify Backend Started

```bash
# Check health endpoint
curl http://localhost:3000/health

# Check logs
docker logs recicla-backend --tail 50
# or
pm2 logs backend --lines 50
```

### Step 8: Smoke Test

Test the new approval endpoint:

```bash
# 1. Login as admin
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@recicla.com","password":"admin123"}' | jq -r '.token')

# 2. Create test collection (as collector)
COLLECTOR_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"collector@test.com","password":"password123"}' | jq -r '.token')

COLLECTION_ID=$(curl -s -X POST http://localhost:3000/api/collections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $COLLECTOR_TOKEN" \
  -d '{
    "type": "plastico",
    "weight": 1.0,
    "location": "Test Deployment",
    "status": "awaiting_approval"
  }' | jq -r '.collection.id')

echo "Test collection ID: $COLLECTION_ID"

# 3. Approve collection
curl -X POST http://localhost:3000/api/collections/$COLLECTION_ID/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected:**
- ✅ Response: "Coleta aprovada com sucesso"
- ✅ No PostgreSQL errors in logs
- ✅ User points increased
- ✅ Collection status is "completed"

### Step 9: Verify in Database

```sql
-- Check the test collection
SELECT id, status, blockchain_hash, points 
FROM collection_items 
WHERE status = 'completed' 
ORDER BY updated_at DESC 
LIMIT 1;

-- Verify blockchain_hash is populated (proves digest() works)
-- Verify status is 'completed'

-- Check points transaction was created
SELECT * FROM points_transactions 
ORDER BY created_at DESC 
LIMIT 1;
```

### Step 10: Monitor Production

Monitor for 15-30 minutes after deployment:

```bash
# Watch logs for errors
docker logs -f recicla-backend | grep -i error

# Monitor database connections
psql -U recicla_user -d recicla_db -c "SELECT count(*) FROM pg_stat_activity;"
```

## Post-Deployment Validation

### Functional Tests

- [ ] Admin can approve collections successfully
- [ ] User receives credits automatically
- [ ] No digest() errors in logs
- [ ] Blockchain hashes are generated
- [ ] Points transactions are recorded
- [ ] Tracking events are created
- [ ] Non-admin users cannot approve (403 error)
- [ ] Already completed collections cannot be re-approved (400 error)

### Performance Check

- [ ] Response times are normal (<500ms for approval)
- [ ] Database CPU/memory usage is normal
- [ ] No connection pool exhaustion

## Rollback Procedure (If Needed)

If critical issues occur:

### Option 1: Revert Code Only (Keep Database)

```bash
# Revert to previous commit
git revert HEAD~4..HEAD
git push

# Restart backend
docker restart recicla-backend
```

**Note:** The database trigger will remain but won't cause issues if the endpoint isn't called.

### Option 2: Full Rollback (Code + Database)

```bash
# 1. Restore database from backup
docker exec -i recicla-postgres psql -U recicla_user recicla_db < backup_YYYYMMDD_HHMMSS.sql

# 2. Revert code
git revert HEAD~4..HEAD
git push

# 3. Restart backend
docker restart recicla-backend
```

### Option 3: Remove Trigger Only (Keep pgcrypto)

```sql
-- Connect to database
DROP TRIGGER IF EXISTS trigger_auto_credit_on_completion ON collection_items;
DROP FUNCTION IF EXISTS auto_credit_on_completion();
```

## Troubleshooting

### Error: "pgcrypto extension does not exist"

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

If this fails, check PostgreSQL version and extensions:
```sql
SHOW server_version;
SELECT * FROM pg_available_extensions WHERE name = 'pgcrypto';
```

### Error: "trigger function not found"

Reapply the migration:
```bash
cd backend
npx prisma migrate deploy --force
```

### Performance Issues

If the trigger causes slowdowns:

```sql
-- Check trigger execution time
EXPLAIN ANALYZE 
UPDATE collection_items 
SET status = 'completed' 
WHERE id = '<test_id>';
```

Consider adding indexes if needed:
```sql
CREATE INDEX IF NOT EXISTS idx_collection_items_status ON collection_items(status);
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
```

## Success Criteria

Deployment is successful when:

✅ Migration applied without errors  
✅ Trigger function created  
✅ Backend restarted successfully  
✅ Smoke test passed  
✅ No digest() errors in logs  
✅ Collections can be approved successfully  
✅ Users receive credits automatically  
✅ No performance degradation  

## Communication

### Notify Stakeholders

Send notification when deployment is complete:

```
Subject: [DEPLOYED] PostgreSQL Digest Fix - Collection Approval

The fix for the collection approval error has been successfully deployed.

Changes:
- Collections can now be approved without errors
- Users receive credits automatically upon approval
- New collection statuses: awaiting_approval, completed

Testing: Fully tested and validated
Monitoring: Active for next 24 hours

No action required from users.
```

## Monitoring Post-Deployment

### Key Metrics to Watch

1. **Error Rate:** Should be 0 for digest-related errors
2. **Approval Success Rate:** Should be 100% for valid approvals
3. **Response Time:** Approval endpoint <500ms
4. **Database Load:** Should remain normal

### Alerts to Configure

```sql
-- Set up alert for digest errors (should be 0)
-- Monitor: PostgreSQL logs for "digest(bytea, unknown)"

-- Set up alert for approval failures
-- Monitor: Application logs for "Erro ao aprovar coleta"

-- Set up alert for trigger failures
-- Monitor: PostgreSQL logs for "auto_credit_on_completion"
```

## Questions or Issues?

If you encounter any issues during deployment:

1. Check logs: `docker logs recicla-backend`
2. Check database: `docker exec recicla-postgres psql -U recicla_user -d recicla_db`
3. Review TESTING_GUIDE.md for detailed validation steps
4. Contact: @diegosanchespereira1 or @Copilot

## References

- **Technical Details:** README_DIGEST_FIX.md
- **Testing Guide:** TESTING_GUIDE.md
- **Issue Tracker:** GitHub Issue #15
- **Pull Request:** GitHub PR #16
