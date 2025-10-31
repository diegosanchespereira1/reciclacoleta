# PostgreSQL digest() Function Error Fix

## Problem Description

When attempting to change the status of a collection from `awaiting_approval` to `completed`, a PostgreSQL error occurred:

```
function digest(bytea, unknown) does not exist
```

## Root Cause

The error occurs because the `digest()` function from PostgreSQL's `pgcrypto` extension was being called without an explicit type cast for the algorithm parameter. PostgreSQL requires the algorithm parameter to be explicitly cast to `text` type (e.g., `'sha256'::text`) instead of being passed as an unknown/ambiguous type.

## Solution Implemented

### 1. Enabled pgcrypto Extension

Created a migration that ensures the `pgcrypto` extension is enabled:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### 2. Created Trigger Function with Proper Type Casting

Implemented an `auto_credit_on_completion()` trigger function that:
- Automatically grants credits to users when a collection status changes to `completed`
- Uses the `digest()` function with **explicit type casting** (`'sha256'::text`) to avoid the error
- Updates user points
- Creates a points transaction record
- Generates a blockchain hash for verification

**Key Fix:**
```sql
digest(
  data::bytea,
  'sha256'::text  -- Explicit cast to text prevents the error
)
```

### 3. Added New Collection Statuses

Extended the collection status workflow to include:
- `collected` - Initial collection state
- `processing` - Collection being processed
- `awaiting_approval` - Collection waiting for admin approval
- `completed` - Collection approved and completed (triggers automatic credit)
- `processed` - Collection has been processed
- `disposed` - Collection has been disposed

### 4. Created Approval API Endpoint

Added `POST /api/collections/:id/approve` endpoint that:
- Requires admin authentication
- Changes collection status from `awaiting_approval` to `completed`
- Automatically triggers the credit function via database trigger
- Creates a tracking event for the approval
- Returns updated collection info and points granted

## Files Modified

1. **backend/prisma/schema.prisma**
   - Updated status comment to include new statuses

2. **backend/prisma/migrations/20251031_enable_pgcrypto_and_fix_digest/migration.sql**
   - New migration file with pgcrypto extension
   - Trigger function with proper digest() type casting
   - Trigger creation

3. **backend/routes/collections.js**
   - Added `/approve` endpoint for collection approval

4. **README_DIGEST_FIX.md** (this file)
   - Documentation of the fix

## Testing

To test the fix:

### 1. Apply the Migration

```bash
cd backend
npx prisma migrate deploy
```

### 2. Create a Collection with awaiting_approval Status

```bash
curl -X POST http://localhost:3000/api/collections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "type": "plastico",
    "weight": 5.5,
    "location": "Ponto de Coleta Central",
    "status": "awaiting_approval"
  }'
```

### 3. Approve the Collection (Admin Only)

```bash
curl -X POST http://localhost:3000/api/collections/<COLLECTION_ID>/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### 4. Verify

- Collection status should change to `completed`
- User should receive credits automatically
- No PostgreSQL digest error should occur
- Points transaction should be created
- Blockchain hash should be generated

## Expected Results

✅ Collection status changes from `awaiting_approval` to `completed` without errors  
✅ User receives credits automatically  
✅ Points transaction is recorded  
✅ Tracking event is created  
✅ No `function digest(bytea, unknown) does not exist` error occurs  

## Technical Details

### Why the Error Occurred

PostgreSQL's `digest()` function signature is:
```
digest(data bytea, type text) returns bytea
```

When the algorithm parameter is passed without explicit casting (e.g., just `'sha256'`), PostgreSQL may treat it as type `unknown`, causing a type mismatch error because there's no overload for `digest(bytea, unknown)`.

### The Fix

By explicitly casting the algorithm parameter to `text` using PostgreSQL's cast operator `::text`:
```sql
digest(data::bytea, 'sha256'::text)
```

PostgreSQL now knows exactly which function overload to use, resolving the error.

## References

- PostgreSQL pgcrypto documentation: https://www.postgresql.org/docs/current/pgcrypto.html
- PostgreSQL type casting: https://www.postgresql.org/docs/current/sql-expressions.html#SQL-SYNTAX-TYPE-CASTS
