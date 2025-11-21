# Testing Fresh Signup System

## What Was Fixed
1. ✅ Dropped all old conflicting RLS policies
2. ✅ Created new `create_user_profile()` function with proper error handling
3. ✅ Set up trigger to auto-create profiles on signup
4. ✅ Clean RLS policies for profiles and user_tokens
5. ✅ Updated signup API with better validation and rollback
6. ✅ Mobile app now uses config for API URLs

## Test Checklist

### Web Signup Test
1. Go to `http://localhost:3000/signup`
2. Fill in the form:
   - Full Name: Test User
   - Enrollment: TEST12345
   - Email: test@medicaps.ac.in
   - Password: test123
   - Confirm Password: test123
3. Click "Create Account"
4. Should redirect to login with success message

### Mobile Signup Test
1. Open mobile app
2. Navigate to signup screen
3. Fill in same details
4. Should show success toast and redirect to login

### Verification Queries (Run in Supabase SQL Editor)

**Check if user was created:**
```sql
SELECT id, email, created_at
FROM auth.users
WHERE email = 'test@medicaps.ac.in';
```

**Check if profile was created:**
```sql
SELECT id, full_name, enrollment_number, college_email, profile_completed
FROM public.profiles
WHERE college_email = 'test@medicaps.ac.in';
```

**Check if tokens were initialized:**
```sql
SELECT user_id, balance
FROM public.user_tokens
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'test@medicaps.ac.in'
);
```

**Check debug logs (if any errors occurred):**
```sql
SELECT *
FROM public.debug_log
WHERE event = 'profile_creation_error'
ORDER BY created_at DESC
LIMIT 5;
```

## Expected Results
- ✅ User created in auth.users
- ✅ Profile created in profiles with full_name, enrollment_number, college_email
- ✅ Token record created with balance = 0
- ✅ No errors in debug_log

## Error Testing

### Test duplicate email:
Try signing up with same email again - should get "Email already registered"

### Test duplicate enrollment:
Try signing up with same enrollment - should get "Enrollment number already registered"

### Test invalid email domain:
Try `test@gmail.com` - should get "Only @medicaps.ac.in emails are allowed"

## Cleanup Test Data
```sql
-- Delete test user (run after testing)
DELETE FROM auth.users WHERE email = 'test@medicaps.ac.in';
-- Profile and tokens will be deleted automatically due to CASCADE
```
