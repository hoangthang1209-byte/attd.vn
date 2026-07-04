/** True when either the owner gate cookie or a signed staff identity cookie is valid. */
export function isAdminRequestAuthenticated(input: {
  ownerGateValid: boolean;
  staffPayload: unknown | null;
}): boolean {
  return input.ownerGateValid || input.staffPayload !== null;
}
