# Testing Guide for PostgreSQL Digest Fix

## Prerequisites

- PostgreSQL database running
- Backend application configured
- Admin and collector user accounts created

## Manual Testing Steps

### Step 1: Apply the Migration

```bash
cd backend
npx prisma migrate deploy
```

Expected output:
```
✓ Database schema is up to date!
```

### Step 2: Verify pgcrypto Extension

Connect to your PostgreSQL database and run:

```sql
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
```

Expected: Should return one row showing pgcrypto is installed.

### Step 3: Verify Trigger Function

```sql
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'auto_credit_on_completion';
```

Expected: Should return the function definition with the explicit `'sha256'::text` cast.

### Step 4: Create a Test Collection

As a collector user, create a collection with `awaiting_approval` status:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "collector@test.com",
    "password": "password123"
  }'
```

Save the returned token, then:

```bash
curl -X POST http://localhost:3000/api/collections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <COLLECTOR_TOKEN>" \
  -d '{
    "type": "plastico",
    "weight": 5.5,
    "location": "Test Location",
    "status": "awaiting_approval",
    "photoUrl": "https://example.com/photo.jpg"
  }'
```

Save the returned collection ID.

### Step 5: Check Initial User Points

```bash
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <COLLECTOR_TOKEN>"
```

Note the current `totalPoints` value.

### Step 6: Approve the Collection

Login as admin:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123"
  }'
```

Approve the collection:

```bash
curl -X POST http://localhost:3000/api/collections/<COLLECTION_ID>/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Expected response:
```json
{
  "message": "Coleta aprovada com sucesso",
  "collection": {
    "id": "...",
    "status": "completed",
    ...
  },
  "pointsGranted": <points>,
  "userTotalPoints": <new_total>
}
```

### Step 7: Verify Results

#### Check Collection Status

```bash
curl http://localhost:3000/api/collections/<COLLECTION_ID> \
  -H "Authorization: Bearer <COLLECTOR_TOKEN>"
```

Verify:
- ✅ Status is "completed"
- ✅ `blockchainHash` field is populated (proves digest() worked)
- ✅ No error occurred

#### Check User Points Increased

```bash
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <COLLECTOR_TOKEN>"
```

Verify:
- ✅ `totalPoints` increased by the collection points value

#### Check Points Transaction Created

Query the database:

```sql
SELECT * FROM points_transactions 
WHERE collection_id = '<COLLECTION_ID>' 
ORDER BY created_at DESC 
LIMIT 1;
```

Verify:
- ✅ A new transaction exists
- ✅ Type is 'earned'
- ✅ Description mentions "Crédito automático"

#### Check Tracking Event Created

```bash
curl http://localhost:3000/api/collections/<COLLECTION_ID> \
  -H "Authorization: Bearer <COLLECTOR_TOKEN>"
```

Check `trackingHistory` array for:
- ✅ A "completed" stage event
- ✅ Notes mention "Coleta aprovada" and points granted

### Step 8: Test Error Cases

#### Try to Approve Already Completed Collection

```bash
curl -X POST http://localhost:3000/api/collections/<COLLECTION_ID>/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Expected:
- ❌ Status 400
- Message: "Coleta não está aguardando aprovação"

#### Try to Approve as Non-Admin

```bash
curl -X POST http://localhost:3000/api/collections/<COLLECTION_ID>/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <COLLECTOR_TOKEN>"
```

Expected:
- ❌ Status 403
- Message: "Apenas administradores podem aprovar coletas"

## Database-Level Testing

### Test Trigger Directly

You can test the trigger by updating a collection directly in the database:

```sql
-- Create a test collection (adjust collector_id to an existing user)
INSERT INTO collection_items (
  id, type, weight, location, collector_id, collector_name, 
  status, qr_code, tracking_id, points, created_at, updated_at
) VALUES (
  gen_random_uuid(), 
  'plastico', 
  5.0, 
  'Test Location', 
  '<existing_user_id>', 
  'Test User',
  'awaiting_approval',
  'QR-TEST-' || floor(random() * 1000000),
  'TRK-TEST-' || floor(random() * 1000000),
  75,
  NOW(),
  NOW()
) RETURNING id;
```

Save the returned ID, then update the status:

```sql
UPDATE collection_items 
SET status = 'completed' 
WHERE id = '<collection_id>';
```

Verify the trigger executed:

```sql
-- Check user points were updated
SELECT * FROM user_points WHERE user_id = '<existing_user_id>';

-- Check transaction was created
SELECT * FROM points_transactions WHERE collection_id = '<collection_id>';

-- Check blockchain hash was generated (proves digest() works)
SELECT id, blockchain_hash FROM collection_items WHERE id = '<collection_id>';
```

Expected:
- ✅ Points transaction exists
- ✅ User points increased
- ✅ `blockchain_hash` is populated (hex string)
- ✅ **NO error about digest function**

## Success Criteria

✅ Collection status changes from `awaiting_approval` to `completed` without errors  
✅ User receives credits automatically (points increase)  
✅ Points transaction is recorded in database  
✅ Tracking event is created for the approval  
✅ Blockchain hash is generated using digest() function  
✅ **NO `function digest(bytea, unknown) does not exist` error occurs**  
✅ Admin can approve, collector cannot  
✅ Already completed collections cannot be re-approved  

## Troubleshooting

### If pgcrypto Extension Not Found

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### If Trigger Doesn't Fire

Check if trigger exists:
```sql
SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_auto_credit_on_completion';
```

Manually drop and recreate:
```sql
DROP TRIGGER IF EXISTS trigger_auto_credit_on_completion ON collection_items;
CREATE TRIGGER trigger_auto_credit_on_completion
  AFTER UPDATE ON collection_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_credit_on_completion();
```

### Check Database Logs

```bash
# If using Docker
docker logs <postgres_container> --tail 50

# Or check PostgreSQL logs directly
tail -f /var/log/postgresql/postgresql-*.log
```

Look for any errors related to digest() function.

## Performance Note

The trigger runs `AFTER UPDATE` on each row. For bulk updates, this may be slower. If you need to approve many collections at once, consider:

1. Using a batch approval endpoint
2. Temporarily disabling the trigger for bulk operations
3. Running the credit calculations in a background job

## Rollback (if needed)

To rollback the migration:

```sql
-- Drop trigger
DROP TRIGGER IF EXISTS trigger_auto_credit_on_completion ON collection_items;

-- Drop function
DROP FUNCTION IF EXISTS auto_credit_on_completion();

-- Remove extension (only if not used elsewhere)
-- DROP EXTENSION IF EXISTS pgcrypto;
```

However, it's recommended to keep the fix in place to prevent the digest error.
