-- Fix: Hacer household_id nullable en invitations
-- Esto es necesario para invitaciones tipo 'app' que no están asociadas a un household específico

alter table invitations
  alter column household_id drop not null;
