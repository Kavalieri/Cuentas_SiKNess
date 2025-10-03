-- =====================================================
-- Sistema de Contribuciones Proporcionales
-- =====================================================
-- Permite gestionar aportes mensuales basados en ingresos
-- de cada miembro del hogar.

-- 1. Configuración de ingresos por miembro
-- =====================================================
create table if not exists member_incomes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  monthly_income numeric(10,2) not null check (monthly_income >= 0),
  effective_from date not null,
  created_at timestamp with time zone not null default now(),
  
  -- Un miembro solo puede tener un ingreso activo por fecha
  constraint member_incomes_household_user_date_key unique (household_id, user_id, effective_from)
);

create index idx_member_incomes_household_user 
  on member_incomes(household_id, user_id);
create index idx_member_incomes_effective_from 
  on member_incomes(effective_from desc);

comment on table member_incomes is 'Ingresos mensuales de cada miembro del hogar';
comment on column member_incomes.effective_from is 'Fecha desde la que aplica este ingreso';

-- 2. Configuración del hogar (meta de contribución mensual)
-- =====================================================
create table if not exists household_settings (
  household_id uuid primary key references households(id) on delete cascade,
  monthly_contribution_goal numeric(10,2) not null check (monthly_contribution_goal >= 0),
  currency varchar(3) not null default 'EUR',
  updated_at timestamp with time zone not null default now(),
  updated_by uuid references auth.users(id)
);

comment on table household_settings is 'Configuración de contribución mensual del hogar';
comment on column household_settings.monthly_contribution_goal is 'Meta total de contribución mensual (ej: 2000€)';

-- 3. Contribuciones mensuales calculadas por miembro
-- =====================================================
create table if not exists contributions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  year integer not null check (year between 2020 and 2100),
  month integer not null check (month between 1 and 12),
  expected_amount numeric(10,2) not null check (expected_amount >= 0),
  paid_amount numeric(10,2) not null default 0 check (paid_amount >= 0),
  status varchar(20) not null default 'pending' check (status in ('pending', 'partial', 'paid', 'overpaid')),
  paid_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  
  -- Solo una contribución por miembro por mes
  constraint contributions_household_user_month_key unique (household_id, user_id, year, month)
);

create index idx_contributions_household_month 
  on contributions(household_id, year desc, month desc);
create index idx_contributions_user_status 
  on contributions(user_id, status);

comment on table contributions is 'Contribuciones mensuales esperadas y pagadas de cada miembro';
comment on column contributions.expected_amount is 'Monto calculado proporcionalmente según ingresos';
comment on column contributions.paid_amount is 'Monto efectivamente pagado (suma de gastos)';

-- 4. Ajustes manuales a contribuciones
-- =====================================================
create table if not exists contribution_adjustments (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references contributions(id) on delete cascade,
  amount numeric(10,2) not null check (amount != 0),
  reason text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamp with time zone not null default now()
);

create index idx_contribution_adjustments_contribution 
  on contribution_adjustments(contribution_id);

comment on table contribution_adjustments is 'Ajustes manuales a contribuciones (ej: vacaciones, enfermedad)';
comment on column contribution_adjustments.amount is 'Monto positivo o negativo del ajuste';

-- =====================================================
-- RLS Policies para Contribuciones
-- =====================================================

-- member_incomes
alter table member_incomes enable row level security;

create policy "Members can view incomes in their household"
  on member_incomes for select
  using (household_id in (
    select household_id from household_members where user_id = auth.uid()
  ));

create policy "Members can insert their own income"
  on member_incomes for insert
  with check (
    user_id = auth.uid() 
    and household_id in (
      select household_id from household_members where user_id = auth.uid()
    )
  );

create policy "Members can update their own income"
  on member_incomes for update
  using (
    user_id = auth.uid() 
    and household_id in (
      select household_id from household_members where user_id = auth.uid()
    )
  );

-- household_settings
alter table household_settings enable row level security;

create policy "Members can view household settings"
  on household_settings for select
  using (household_id in (
    select household_id from household_members where user_id = auth.uid()
  ));

create policy "Members can update household settings"
  on household_settings for all
  using (household_id in (
    select household_id from household_members where user_id = auth.uid()
  ))
  with check (household_id in (
    select household_id from household_members where user_id = auth.uid()
  ));

-- contributions
alter table contributions enable row level security;

create policy "Members can view contributions in their household"
  on contributions for select
  using (household_id in (
    select household_id from household_members where user_id = auth.uid()
  ));

create policy "System can manage contributions"
  on contributions for all
  using (household_id in (
    select household_id from household_members where user_id = auth.uid()
  ))
  with check (household_id in (
    select household_id from household_members where user_id = auth.uid()
  ));

-- contribution_adjustments
alter table contribution_adjustments enable row level security;

create policy "Members can view adjustments in their household"
  on contribution_adjustments for select
  using (
    contribution_id in (
      select id from contributions
      where household_id in (
        select household_id from household_members where user_id = auth.uid()
      )
    )
  );

create policy "Members can create adjustments"
  on contribution_adjustments for insert
  with check (
    created_by = auth.uid()
    and contribution_id in (
      select id from contributions
      where household_id in (
        select household_id from household_members where user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- Funciones Helper
-- =====================================================

-- Obtener el ingreso activo de un miembro en una fecha
create or replace function get_member_income(
  p_household_id uuid,
  p_user_id uuid,
  p_date date default current_date
)
returns numeric
language plpgsql
security definer
as $$
declare
  v_income numeric;
begin
  select monthly_income
  into v_income
  from member_incomes
  where household_id = p_household_id
    and user_id = p_user_id
    and effective_from <= p_date
  order by effective_from desc
  limit 1;
  
  return coalesce(v_income, 0);
end;
$$;

-- Calcular contribuciones proporcionales para un mes
create or replace function calculate_monthly_contributions(
  p_household_id uuid,
  p_year integer,
  p_month integer
)
returns table(
  user_id uuid,
  expected_amount numeric,
  income_percentage numeric
)
language plpgsql
security definer
as $$
declare
  v_goal numeric;
  v_total_income numeric;
  v_reference_date date;
begin
  -- Fecha de referencia: primer día del mes
  v_reference_date := make_date(p_year, p_month, 1);
  
  -- Obtener meta de contribución
  select monthly_contribution_goal
  into v_goal
  from household_settings
  where household_id = p_household_id;
  
  if v_goal is null then
    raise exception 'Household settings not configured';
  end if;
  
  -- Calcular ingreso total del hogar
  select sum(get_member_income(p_household_id, hm.user_id, v_reference_date))
  into v_total_income
  from household_members hm
  where hm.household_id = p_household_id;
  
  if v_total_income = 0 then
    raise exception 'No incomes configured for household members';
  end if;
  
  -- Retornar contribución proporcional por miembro
  return query
  select 
    hm.user_id,
    round(
      (get_member_income(p_household_id, hm.user_id, v_reference_date) / v_total_income) * v_goal,
      2
    ) as expected_amount,
    round(
      (get_member_income(p_household_id, hm.user_id, v_reference_date) / v_total_income) * 100,
      2
    ) as income_percentage
  from household_members hm
  where hm.household_id = p_household_id;
end;
$$;

-- Actualizar estado de una contribución según lo pagado
create or replace function update_contribution_status(p_contribution_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_expected numeric;
  v_paid numeric;
  v_new_status varchar(20);
begin
  select expected_amount, paid_amount
  into v_expected, v_paid
  from contributions
  where id = p_contribution_id;
  
  if v_paid = 0 then
    v_new_status := 'pending';
  elsif v_paid < v_expected then
    v_new_status := 'partial';
  elsif v_paid = v_expected then
    v_new_status := 'paid';
  else
    v_new_status := 'overpaid';
  end if;
  
  update contributions
  set 
    status = v_new_status,
    paid_at = case when v_new_status in ('paid', 'overpaid') then now() else null end,
    updated_at = now()
  where id = p_contribution_id;
end;
$$;

comment on function get_member_income is 'Obtiene el ingreso mensual activo de un miembro en una fecha';
comment on function calculate_monthly_contributions is 'Calcula contribuciones proporcionales para un mes';
comment on function update_contribution_status is 'Actualiza el estado de una contribución según paid_amount';
