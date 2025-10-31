-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create or replace function to automatically grant credits when collection is completed
-- Note: Using explicit ::text cast for digest() algorithm parameter to avoid type errors
CREATE OR REPLACE FUNCTION auto_credit_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if status changed to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update or create user points record with proper locking to prevent race conditions
    INSERT INTO user_points (
      id,
      user_id,
      total_points,
      level,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      NEW.collector_id,
      NEW.points,
      'Iniciante',
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      total_points = user_points.total_points + EXCLUDED.total_points,
      updated_at = NOW();
    
    -- Create points transaction record with hash
    INSERT INTO points_transactions (
      id,
      user_id,
      collection_id,
      points,
      type,
      description,
      created_at
    ) VALUES (
      gen_random_uuid(),
      NEW.collector_id,
      NEW.id,
      NEW.points,
      'earned',
      'Crédito automático por aprovação de coleta de ' || NEW.weight || 'kg de ' || NEW.type,
      NOW()
    );
    
    -- Optional: Create a verification hash using digest with explicit type casting
    -- This demonstrates the fix for the digest error
    -- Note: Using structured format with delimiters to prevent hash collisions
    UPDATE collection_items
    SET 
      blockchain_hash = encode(
        digest(
          ('collection:' || NEW.id || '|collector:' || NEW.collector_id || '|weight:' || NEW.weight::text || '|type:' || NEW.type || '|timestamp:' || NOW()::text)::bytea,
          'sha256'::text  -- Explicit cast to text to avoid "function digest(bytea, unknown) does not exist" error
        ),
        'hex'
      ),
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_auto_credit_on_completion ON collection_items;

CREATE TRIGGER trigger_auto_credit_on_completion
  AFTER UPDATE ON collection_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_credit_on_completion();

-- Add awaiting_approval and completed to valid statuses (informational comment)
-- The Prisma schema should allow these statuses: 'collected', 'processing', 'awaiting_approval', 'completed', 'processed', 'disposed'
