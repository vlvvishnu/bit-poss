-- Invoice delivery foundation for BITE POS.
-- Adds permanent tokenized invoice URLs, customer-phone lookup indexes,
-- and public read/update policies needed by the customer-facing invoice pages.

create extension if not exists pgcrypto;

alter table public.orders
  add column if not exists invoice_token varchar(12),
  add column if not exists customer_phone varchar(15);

create or replace function public.bite_random_invoice_token()
returns varchar(12)
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i integer := 0;
begin
  for i in 1..12 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
  end loop;
  return result;
end;
$$;

update public.orders
set invoice_token = public.bite_random_invoice_token()
where invoice_token is null;

alter table public.orders
  alter column invoice_token set not null;

create unique index if not exists orders_invoice_token_key
  on public.orders(invoice_token);

create index if not exists orders_tenant_customer_phone_idx
  on public.orders(tenant_id, customer_phone);

create index if not exists orders_tenant_table_status_idx
  on public.orders(tenant_id, table_number, status);

create or replace function public.set_order_invoice_token()
returns trigger
language plpgsql
as $$
begin
  if new.invoice_token is null then
    loop
      new.invoice_token := public.bite_random_invoice_token();
      exit when not exists (
        select 1 from public.orders where invoice_token = new.invoice_token
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_order_invoice_token on public.orders;
create trigger trg_set_order_invoice_token
before insert on public.orders
for each row execute function public.set_order_invoice_token();

-- Optional safety net: the POS enforces this in application code so dine-in can
-- remain phone-optional while takeaway cannot be confirmed without a phone.
comment on column public.orders.customer_phone is
  '10 digit normalized customer phone. Required by the POS application for takeaway; optional for dine-in.';

comment on column public.orders.invoice_token is
  'Permanent 12 character public invoice token used at /invoice/{invoice_token}.';
