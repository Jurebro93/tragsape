/** Admin: okvir i navigacija. Svaki odjeljak ima vlastitu datoteku poruka. */
export const admin = {
  title: "Admin",
  nav: [
    { href: "/admin", label: "Pregled" },
    { href: "/admin/narudzbe", label: "Narudžbe" },
    { href: "/admin/lijevak", label: "Lijevak i atribucija" },
    { href: "/admin/geste", label: "Geste" },
    { href: "/admin/kodovi", label: "Kodovi i partneri" },
    { href: "/admin/donacije", label: "Donacije" },
    { href: "/admin/clanci", label: "Članci" },
    { href: "/admin/newsletter", label: "Newsletter" },
    { href: "/admin/sekcije", label: "Prodajne sekcije" },
    { href: "/admin/moderacija", label: "Moderacija" },
    { href: "/admin/postavke", label: "Cijene i postavke" },
    { href: "/admin/sustav", label: "Stanje sustava" },
  ],
  backToSite: "Na stranicu",
} as const;
