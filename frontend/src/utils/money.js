export const moneyValue = value => Number(String(value ?? '').replace(',', '.')) || 0;

export function moneyInput(value) {
    return /^\d{0,7}([,.]\d{0,2})?$/.test(value);
}
