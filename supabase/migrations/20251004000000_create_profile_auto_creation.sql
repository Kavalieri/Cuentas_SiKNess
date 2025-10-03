-- Migration: Auto-create profile when auth.users entry is created
-- This is CRITICAL for the profiles-based architecture to work

-- Function to create profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, auth_user_id, email, display_name, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    NEW.email,
    COALESCE(SPLIT_PART(NEW.email, '@', 1), 'Usuario'), -- Usar parte antes del @ como display_name
    NOW(),
    NOW()
  )
  ON CONFLICT (auth_user_id) DO NOTHING; -- Prevent duplicates if trigger fires twice
  
  RETURN NEW;
END;
$$;

-- Trigger on auth.users INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill: Create profiles for existing auth.users without profiles
INSERT INTO public.profiles (id, auth_user_id, email, display_name, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  au.id,
  au.email,
  COALESCE(SPLIT_PART(au.email, '@', 1), 'Usuario'),
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON p.auth_user_id = au.id
WHERE p.id IS NULL
ON CONFLICT (auth_user_id) DO NOTHING;

COMMENT ON FUNCTION public.handle_new_user IS 'Auto-creates profile entry when new user is created in auth.users';
