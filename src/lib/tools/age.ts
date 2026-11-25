/** Najveća dob koju kalkulatori primaju; iznad toga unos je gotovo sigurno pogreška. */
export const MAX_AGE_YEARS = 30;

/**
 * Dob iz polja obrasca u mjesecima, ili null ako unos nije valjan
 * (prazno, negativno, decimalno, više od 11 mjeseci ili više od najveće dobi).
 * Prazno polje godina ili mjeseci broji se kao nula, ali ne oba odjednom.
 */
export function parseAgeMonths(years: string, months: string): number | null {
  const yearsText = years.trim();
  const monthsText = months.trim();
  if (yearsText === "" && monthsText === "") {
    return null;
  }
  const wholeNumber = /^\d{1,3}$/;
  if ((yearsText !== "" && !wholeNumber.test(yearsText)) || (monthsText !== "" && !wholeNumber.test(monthsText))) {
    return null;
  }
  const y = yearsText === "" ? 0 : Number(yearsText);
  const m = monthsText === "" ? 0 : Number(monthsText);
  if (m > 11 || y > MAX_AGE_YEARS || (y === MAX_AGE_YEARS && m > 0)) {
    return null;
  }
  return y * 12 + m;
}

/** Ravnomjerno (linearno) između dviju poznatih točaka. */
export function interpolate(x: number, x0: number, y0: number, x1: number, y1: number): number {
  if (x1 === x0) {
    return y0;
  }
  return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
}
