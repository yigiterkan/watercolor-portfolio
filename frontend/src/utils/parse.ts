// "2500,50" de "2500.50" de kabul edilir; geçersizse NaN.
export function parseDecimal(value: string) {
  const normalized = value.trim().replace(',', '.')
  return /^\d+(\.\d{1,2})?$/.test(normalized) ? Number(normalized) : NaN
}

export function parseInteger(value: string) {
  return /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN
}
