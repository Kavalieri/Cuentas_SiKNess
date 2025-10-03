-- =====================================================
-- Fix: Arreglar constraint de invitaciones
-- =====================================================
-- Problema: El constraint actual incluye 'status', impidiendo
-- crear nuevas invitaciones después de cancelar/aceptar una anterior
-- 
-- Solución: Usar constraint parcial que solo aplica a 'pending'

-- 1. Eliminar el constraint problemático
alter table invitations 
  drop constraint if exists invitations_household_email_pending_key;

-- 2. Crear un unique index parcial que solo aplica a invitaciones pendientes
-- Esto permite tener múltiples invitaciones cancelled/accepted/expired
-- pero solo UNA pending por (household_id, email)
create unique index if not exists invitations_household_email_pending_unique
  on invitations (household_id, email)
  where status = 'pending';

-- Comentario explicativo
comment on index invitations_household_email_pending_unique is 
'Permite solo una invitación pendiente por (household, email). Las invitaciones cancelled/accepted/expired pueden coexistir.';
