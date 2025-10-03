# Testing Checklist - Database Refactoring Verification

**Date**: October 3, 2025  
**Server**: http://localhost:3000  
**Purpose**: Verify all critical flows work after `user_id` → `profile_id` migration

---

## ✅ Pre-Testing Verification

- [x] Build passes: `npm run build` ✅
- [x] Migrations applied: `npx supabase db push` ✅
- [x] Types regenerated: `npx supabase gen types` ✅
- [x] Code pushed to GitHub ✅
- [x] Dev server running: `npm run dev` ✅

---

## 🧪 Critical Flows to Test

### 1. Authentication Flow

- [ ] **Login**
  - Go to http://localhost:3000/login
  - Enter email
  - Check magic link in email
  - Verify successful login
  - **Expected**: User redirects to `/app` dashboard

- [ ] **Profile Resolution**
  - After login, check browser console for errors
  - **Expected**: No errors about `user_id` or `profile_id`

---

### 2. Household Management

- [ ] **Create New Household**
  - If no household exists, should redirect to `/app/household/create`
  - Fill in household name
  - Submit form
  - **Expected**: 
    - Household created successfully
    - Automatically set as active household
    - User is owner
    - Redirect to `/app`

- [ ] **View Household Settings**
  - Go to `/app/household`
  - Check "Miembros" tab
  - **Expected**:
    - Current user appears with 👑 Owner badge
    - Email displayed correctly

- [ ] **Switch Between Households** (if you have multiple)
  - Click household selector in header (if visible)
  - Switch to different household
  - **Expected**:
    - Page reloads
    - Data updates to show new household
    - No errors in console

---

### 3. Member Invitation & Management

- [ ] **Create Invitation**
  - Go to `/app/household` → "Miembros" tab
  - Click "Invitar Miembro"
  - Enter email address
  - Submit
  - **Expected**:
    - Toast: "Invitación enviada"
    - Invitation appears in "Invitaciones Pendientes"

- [ ] **Accept Invitation** (requires second user/browser)
  - Copy invitation link
  - Open in incognito/different browser
  - Login with invited email
  - Accept invitation
  - **Expected**:
    - Invitation accepted
    - New household automatically becomes active
    - User redirects to `/app`
    - Can see household data

- [ ] **View Members List**
  - Go to `/app/household` → "Miembros" tab
  - **Expected**:
    - All members displayed with correct emails
    - Roles shown correctly (Owner/Member)
    - Current income displayed

---

### 4. Transactions (Expenses/Income)

- [ ] **Create Expense**
  - Go to `/app/expenses`
  - Click "Añadir Gasto"
  - Fill in:
    - Amount: 50
    - Category: (select any)
    - Description: "Test expense"
    - Date: (today)
  - Submit
  - **Expected**:
    - Toast: "Movimiento guardado"
    - Transaction appears in list
    - Amount formatted correctly

- [ ] **Edit Transaction**
  - Click edit button on any transaction
  - Change description
  - Submit
  - **Expected**:
    - Toast: "Movimiento actualizado"
    - Changes reflected immediately

- [ ] **Delete Transaction**
  - Click delete button
  - Confirm
  - **Expected**:
    - Toast: "Movimiento eliminado"
    - Transaction removed from list

- [ ] **View Dashboard**
  - Go to `/app`
  - **Expected**:
    - Monthly summary shows correct totals
    - Recent transactions displayed
    - Charts render correctly
    - No console errors

---

### 5. Contributions System

- [ ] **Set Member Income**
  - Go to `/app/profile`
  - Find "Ingreso Mensual" section
  - Enter amount: 2000
  - Submit
  - **Expected**:
    - Toast: "Ingreso actualizado"
    - Amount saved

- [ ] **Set Contribution Goal**
  - Go to `/app/contributions` or `/app/household` → "Contribuciones"
  - Set monthly goal: 1500
  - Submit
  - **Expected**:
    - Goal updated
    - Contributions recalculated

- [ ] **Calculate Contributions**
  - Go to `/app/contributions`
  - Click "Calcular Contribuciones"
  - **Expected**:
    - Toast: "Contribuciones calculadas"
    - Each member has expected amount based on income ratio
    - Status shows "pending" or "partial"

- [ ] **Mark Contribution as Paid**
  - Go to `/app/household` → "Overview"
  - Find "Fondo Mensual" section
  - Click "Marcar como Aportado"
  - **Expected**:
    - Toast: "Contribución actualizada"
    - Status changes to "paid" or "partial"
    - Progress bar updates

- [ ] **Create Pre-Payment**
  - Go to `/app/contributions`
  - Find "Pre-Pagos" section
  - Create pre-payment:
    - Member: (select)
    - Amount: 100
    - Category: (select)
    - Description: "Test pre-payment"
  - **Expected**:
    - Toast: "Pre-pago registrado"
    - Pre-payment appears in list
    - Contribution amount adjusts

---

### 6. Categories Management

- [ ] **Create Category**
  - Go to `/app/categories`
  - Click "Añadir Categoría"
  - Fill in:
    - Name: "Test Category"
    - Type: Expense
    - Icon: 🧪
  - Submit
  - **Expected**:
    - Toast: "Categoría creada"
    - Category appears in list

- [ ] **Edit Category**
  - Click edit on any category
  - Change name
  - Submit
  - **Expected**:
    - Changes saved
    - Updates reflected in expense forms

- [ ] **Delete Category**
  - Click delete on a category (that has no transactions)
  - Confirm
  - **Expected**:
    - Category deleted
    - Removed from lists

---

### 7. Profile Management

- [ ] **Update Profile**
  - Go to `/app/profile`
  - Update name or email
  - Submit
  - **Expected**:
    - Changes saved
    - Toast confirmation

- [ ] **View Households List**
  - Go to `/app/profile`
  - Check "Mis Hogares" section
  - **Expected**:
    - All households displayed
    - Active household marked
    - Can switch between households

---

### 8. Admin Functions (if system admin)

- [ ] **View All Households**
  - Go to `/app/admin/households`
  - **Expected**:
    - List of all households
    - Member counts
    - No errors

- [ ] **View All Users**
  - Go to `/app/admin/members`
  - **Expected**:
    - List of all users with profiles
    - Emails displayed
    - No errors about `user_id`

---

## 🐛 Console Monitoring

During all tests, monitor browser console for:

### ❌ RED FLAGS (Should NOT appear)
- `user_id does not exist`
- `Property 'user_id' is undefined`
- `movements` table references
- `note` field references
- RLS policy errors related to `user_id`

### ✅ ACCEPTABLE
- Standard Next.js hydration warnings
- Supabase auth token refresh messages
- Normal React warnings

---

## 🔍 Database Verification

After testing, verify in Supabase Dashboard:

- [ ] **Profiles Table**
  - Go to Supabase → Table Editor → `profiles`
  - **Check**: All users have entries
  - **Check**: `auth_user_id` matches auth.users.id

- [ ] **Transactions Table**
  - Go to Supabase → Table Editor → `transactions`
  - **Check**: No `movements` table exists
  - **Check**: Field is `description` not `note`

- [ ] **Contributions Table**
  - **Check**: All records have `profile_id` not `user_id`

- [ ] **Household Members**
  - **Check**: All records have `profile_id` not `user_id`

---

## 📊 Test Results Summary

### Passed: ____/32

### Failed Tests:
(List any failures here with details)

---

### Critical Issues Found:
(List any blocking issues)

---

### Minor Issues Found:
(List any non-blocking issues)

---

## 🚀 Sign-Off

- [ ] All critical flows tested
- [ ] No console errors related to refactoring
- [ ] Database tables verified
- [ ] Ready for production deployment

**Tester**: _______________  
**Date**: _______________  
**Status**: [ ] PASS / [ ] FAIL  
**Notes**: _______________

---

## 📞 If Issues Found

1. Check browser console for specific errors
2. Check Supabase logs for database errors
3. Verify migrations were applied: `npx supabase db pull`
4. Check that types are up to date: `npx supabase gen types`
5. Review `docs/REFACTORING_COMPLETE_SUMMARY.md` for pattern examples
6. If stuck, check git history: `git log --oneline -10`

---

## 🔄 Rollback Plan (if needed)

If critical issues found:

1. **Code Rollback**:
   ```bash
   git revert HEAD~2  # Revert last 2 commits
   git push origin main --force
   ```

2. **Database Rollback**:
   - Create reverse migrations
   - Or restore from backup
   - Contact team lead before proceeding

3. **Communication**:
   - Document issue in GitHub Issues
   - Notify team in Slack/Discord
   - Mark deployment as failed
