import { flowerPlace, zoneOf, type MeadowSpecies } from "@/lib/meadow";
import { fill } from "@/lib/text";
import { meadow } from "@/messages/hr/meadow";

/** Mjesto traga riječima, npr. „Livada pasa · otisak 2, treći prst”. Dijele ga livada, potvrda i stranica traga. */
export function placeText(species: MeadowSpecies, zoneIndex: number): string {
  const zone = zoneOf(species);
  const place = flowerPlace(zone, zoneIndex);
  const words = meadow.zones[zone];
  return fill(meadow.place.label, { zone: words.name, unit: words.unit, print: place.print, pad: words.pads[place.pad] });
}
