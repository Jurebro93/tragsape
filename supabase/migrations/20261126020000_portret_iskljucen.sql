-- Paket „Memorijal + Portret" i nadogradnja na njega ne prodaju se dok AI portret i spomen-list
-- nisu izgrađeni: ne naplaćuje se ono što se ne može isporučiti. Admin ih uključuje u
-- postavkama cijena (stupac `active`) kad mogućnost bude spremna.
update public.products set active = false, updated_at = now()
  where key in ('memorial_portrait', 'upgrade_portrait');

-- Admin mora vidjeti i isključene proizvode da bi ih mogao uključiti.
create policy products_admin_select on public.products for select to authenticated
  using (public.is_admin());
