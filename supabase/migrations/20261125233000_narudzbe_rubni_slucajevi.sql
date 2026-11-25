-- Rubni slučajevi plaćanja: kupac koji je platio uvijek mora dobiti nešto, a ispunjenje ne smije
-- puknuti ni zaobići adminovo skrivanje.

create index orders_payment_intent_idx on public.orders (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- Objava ne dira memorijal koji je admin sakrio.
create or replace function public.finalize_publish(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  m public.memorials;
  v_base text;
  v_slug text;
begin
  select * into m from public.memorials where id = p_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if m.status in ('published', 'hidden') then
    return m.slug;
  end if;
  if char_length(btrim(m.name)) = 0 then
    raise exception 'name_required' using errcode = 'P0001';
  end if;
  v_base := left(public.slugify(m.name), 40);
  if v_base = '' then
    v_base := 'spomen';
  end if;
  v_slug := v_base || '-' || encode(extensions.gen_random_bytes(3), 'hex');
  update public.memorials
    set status = 'published', published_at = coalesce(published_at, now()), slug = v_slug
    where id = p_id;
  return v_slug;
end $$;

-- Memorijali koje narudžba dotiče, za osvježavanje predmemorije.
create or replace function public.order_memorials(p_order_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(distinct jsonb_build_object('memorial_id', x.memorial_id)), '[]'::jsonb)
  from (
    select l.memorial_id from public.order_lines l
      where l.order_id = p_order_id and l.memorial_id is not null
    union
    select e.memorial_id from public.entitlements e
      join public.order_lines l on l.id = e.order_line_id
      where l.order_id = p_order_id and e.memorial_id is not null
  ) x
$$;

create or replace function public.fulfill_order(p_order_id uuid, p_payment_intent text, p_email text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  l public.order_lines;
  s public.settings;
  pc public.promo_codes;
  pa public.partners;
  m public.memorials;
  v_tier text;
  v_ent uuid;
  v_code text;
  v_days integer;
  v_publish boolean;
  v_visibility text;
  v_gifts jsonb := '[]'::jsonb;
  v_memorials jsonb := '[]'::jsonb;
  -- Stavke koje su plaćene, ali nisu mogle biti primijenjene kako je naručeno. Vidi ih admin.
  v_issues jsonb := '[]'::jsonb;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;
  if o.status = 'paid' then
    return jsonb_build_object('status', 'already_paid', 'user_id', o.user_id,
                              'gifts', '[]'::jsonb, 'memorials', public.order_memorials(o.id),
                              'issues', '[]'::jsonb);
  end if;
  if o.status <> 'pending' then
    raise exception 'invalid_order_status' using errcode = 'P0001';
  end if;

  select * into s from public.settings where id;

  update public.orders
    set status = 'paid', paid_at = now(), stripe_payment_intent_id = p_payment_intent,
        email = coalesce(nullif(p_email, ''), email)
    where id = o.id;

  for l in select * from public.order_lines where order_id = o.id order by position loop
    if l.kind = 'memorial' then
      v_tier := case l.product_key when 'memorial_portrait' then 'portrait' else 'memorial' end;
      m := null;
      if l.memorial_id is not null then
        select * into m from public.memorials
          where id = l.memorial_id and owner_id = o.user_id for update;
      end if;
      -- Pravo se veže na memorijal samo ako pripada kupcu i još je besplatan. Ako je u
      -- međuvremenu već plaćen (npr. dvije kartice u dva prozora), kupac dobiva pravo koje može
      -- primijeniti na drugi spomen, a slučaj se bilježi.
      if m.id is not null and m.tier = 'free' and not exists (
        select 1 from public.entitlements e where e.memorial_id = m.id and e.status = 'applied'
      ) then
        v_publish := coalesce((l.meta ->> 'publish')::boolean, false);
        v_visibility := l.meta ->> 'visibility';
        insert into public.entitlements (order_line_id, tier, owner_id, memorial_id, status, applied_at)
        values (l.id, v_tier, o.user_id, m.id, 'applied', now());
        update public.memorials
          set tier = v_tier,
              visibility = case when v_visibility in ('public', 'unlisted', 'private')
                                then v_visibility else visibility end
          where id = m.id;
        if v_publish and m.status = 'draft' and char_length(btrim(m.name)) > 0 then
          perform public.finalize_publish(m.id);
        end if;
        v_memorials := v_memorials || jsonb_build_object('memorial_id', m.id, 'tier', v_tier);
      else
        insert into public.entitlements (order_line_id, tier, owner_id, status)
        values (l.id, v_tier, o.user_id, 'available');
        if l.memorial_id is not null then
          v_issues := v_issues || jsonb_build_object('line_id', l.id, 'issue', 'memorial_not_free');
          v_memorials := v_memorials || jsonb_build_object('memorial_id', l.memorial_id);
        end if;
      end if;
      if s.donation_per_memorial_cents > 0 then
        insert into public.donation_entries (order_line_id, amount_cents, shelter_id)
        values (l.id, least(s.donation_per_memorial_cents, l.total_cents), s.active_shelter_id);
      end if;

    elsif l.kind = 'upgrade' then
      update public.memorials set tier = 'portrait'
        where id = l.memorial_id and owner_id = o.user_id and tier = 'memorial';
      if found then
        update public.entitlements set tier = 'portrait'
          where memorial_id = l.memorial_id and status = 'applied';
        v_memorials := v_memorials || jsonb_build_object('memorial_id', l.memorial_id, 'tier', 'portrait');
      else
        -- Nadogradnja je plaćena, a spomen više nije na Memorijalu: treba ručni povrat.
        v_issues := v_issues || jsonb_build_object('line_id', l.id, 'issue', 'upgrade_not_applied');
      end if;

    elsif l.kind = 'gift' then
      v_tier := case l.product_key when 'memorial_portrait' then 'portrait' else 'memorial' end;
      insert into public.entitlements (order_line_id, tier, status)
      values (l.id, v_tier, 'available') returning id into v_ent;
      v_code := encode(extensions.gen_random_bytes(12), 'hex');
      insert into public.gifts (order_line_id, entitlement_id, code, buyer_name, recipient_name,
                                recipient_email, message, send_at)
      values (l.id, v_ent, v_code, l.meta ->> 'buyer_name', l.meta ->> 'recipient_name',
              l.meta ->> 'recipient_email', l.meta ->> 'message',
              coalesce((l.meta ->> 'send_at')::timestamptz, now()));
      v_gifts := v_gifts || jsonb_build_object(
        'code', v_code, 'tier', v_tier,
        'recipient_email', l.meta ->> 'recipient_email',
        'recipient_name', l.meta ->> 'recipient_name',
        'buyer_name', l.meta ->> 'buyer_name',
        'message', l.meta ->> 'message');
      if s.donation_per_memorial_cents > 0 then
        insert into public.donation_entries (order_line_id, amount_cents, shelter_id)
        values (l.id, least(s.donation_per_memorial_cents, l.total_cents), s.active_shelter_id);
      end if;

    elsif l.kind = 'gesture' then
      v_days := case l.product_key when 'gesture_7d' then 7 when 'gesture_30d' then 30 else 365 end;
      if l.memorial_id is not null then
        insert into public.gestures (memorial_id, order_line_id, kind, display_name, message, expires_at)
        values (l.memorial_id, l.id, l.meta ->> 'kind',
                coalesce(nullif(btrim(l.meta ->> 'display_name'), ''), 'Netko tko pamti'),
                nullif(btrim(l.meta ->> 'message'), ''),
                now() + make_interval(days => v_days));
        v_memorials := v_memorials || jsonb_build_object('memorial_id', l.memorial_id);
      else
        v_issues := v_issues || jsonb_build_object('line_id', l.id, 'issue', 'gesture_without_memorial');
      end if;
    end if;
  end loop;

  if o.promo_code_id is not null then
    update public.promo_codes set redeemed_count = redeemed_count + 1
      where id = o.promo_code_id returning * into pc;
    if pc.partner_id is not null then
      select * into pa from public.partners where id = pc.partner_id;
      insert into public.partner_commissions (partner_id, order_id, base_cents, commission_cents)
      values (pa.id, o.id, o.total_cents,
              case pa.commission_type
                when 'percent' then round(o.total_cents * pa.commission_value / 100.0)::integer
                else least(pa.commission_value, o.total_cents) end)
      on conflict (order_id) do nothing;
    end if;
  end if;

  return jsonb_build_object('status', 'fulfilled', 'user_id', o.user_id,
                            'gifts', v_gifts, 'memorials', v_memorials, 'issues', v_issues);
end $$;

-- Puni povrat: opoziva prava. Memorijal se vraća u nacrt da privatan sadržaj ne postane javan.
create or replace function public.refund_order(p_order_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  v_memorials jsonb;
  r record;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;
  -- Popis se uzima prije izmjena, dok su prava još vezana uz memorijale.
  v_memorials := public.order_memorials(o.id);
  if o.status = 'refunded' then
    return jsonb_build_object('status', 'already_refunded', 'memorials', v_memorials);
  end if;
  if o.status <> 'paid' then
    raise exception 'invalid_order_status' using errcode = 'P0001';
  end if;

  update public.orders set status = 'refunded', refunded_at = now() where id = o.id;

  for r in
    select e.id, e.memorial_id, e.status from public.entitlements e
    join public.order_lines l on l.id = e.order_line_id
    where l.order_id = o.id and e.status <> 'revoked'
  loop
    update public.entitlements set status = 'revoked' where id = r.id;
    if r.memorial_id is not null and r.status = 'applied' then
      update public.memorials set status = 'draft', tier = 'free', visibility = 'public'
        where id = r.memorial_id and status <> 'hidden';
      update public.memorials set tier = 'free', visibility = 'public'
        where id = r.memorial_id and status = 'hidden';
    end if;
  end loop;

  -- Povrat nadogradnje na Portret vraća paket na Memorijal.
  for r in
    select l.memorial_id from public.order_lines l
    where l.order_id = o.id and l.kind = 'upgrade' and l.memorial_id is not null
  loop
    update public.memorials set tier = 'memorial' where id = r.memorial_id and tier = 'portrait';
    update public.entitlements set tier = 'memorial'
      where memorial_id = r.memorial_id and status = 'applied';
  end loop;

  update public.gestures g set status = 'refunded'
    from public.order_lines l where l.id = g.order_line_id and l.order_id = o.id;
  update public.donation_entries d set status = 'reversed'
    from public.order_lines l where l.id = d.order_line_id and l.order_id = o.id;
  update public.partner_commissions set status = 'void' where order_id = o.id and status = 'accrued';

  return jsonb_build_object('status', 'refunded', 'memorials', v_memorials);
end $$;

revoke execute on function public.order_memorials(uuid) from public, anon, authenticated;
grant execute on function public.order_memorials(uuid) to service_role;
