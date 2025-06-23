/**
 * Validate EAN-8 or EAN-13 codes using standard checksum algorithm.
 */
export function validateEAN(ean: string): boolean {
  if (!/^[0-9]{8}$/.test(ean) && !/^[0-9]{13}$/.test(ean)) return false;
  const digits = ean.split("").map((d) => +d);
  const checkDigit = digits.pop()!;
  // Starting from rightmost (excluding check digit), weights alternate: 3,1,3,1,...
  const reversed = digits.reverse();
  const sum = reversed.reduce((acc, d, idx) => {
    const weight = idx % 2 === 0 ? 3 : 1;
    return acc + d * weight;
  }, 0);
  const calcCheck = (10 - (sum % 10)) % 10;
  return calcCheck === checkDigit;
}
