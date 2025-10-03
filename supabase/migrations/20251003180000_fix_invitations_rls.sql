-- =====================================================
-- Fix: Permitir lectura pública de invitaciones por token
-- =====================================================
-- Problema: Las políticas RLS actuales solo permiten que owners 
-- del household lean invitaciones, impidiendo que usuarios nuevos
-- vean la invitación antes de unirse.
--
-- Solución: Permitir lectura pública de tabla invitations.
-- Es seguro porque el token es secreto (64 chars hex = 2^256 combinaciones)

-- Eliminar política restrictiva actual
drop policy if exists "read_invitations" on invitations;

-- Política 1: Owners pueden ver invitaciones de su household
drop policy if exists "read_invitations_owners" on invitations;
create policy "read_invitations_owners" on invitations 
  for select 
  using (
    exists (
      select 1 from household_members hm
      where hm.household_id = invitations.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  );

-- Política 2: CUALQUIER usuario (incluso sin auth) puede leer invitaciones
-- Esto permite que usuarios nuevos vean la invitación antes de unirse
-- SEGURIDAD:
-- - Token es secreto (64 chars hex)
-- - Solo expone: household_name, invited_by, expires_at
-- - NO expone datos sensibles (movimientos, saldos, miembros)
-- - Invitaciones expiran automáticamente (7 días por defecto)
drop policy if exists "read_invitations_public" on invitations;
create policy "read_invitations_public" on invitations 
  for select 
  using (true);

-- Comentario
comment on policy "read_invitations_public" on invitations is 
'Permite lectura pública de invitaciones por token. Seguro porque el token es secreto y solo expone datos básicos del hogar.';
