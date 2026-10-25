export const ADMIN_EMAIL = "filmwire@gmail.com";

export function isAdmin(userEmail: string | null | undefined): boolean {
  return userEmail?.toLowerCase() === ADMIN_EMAIL;
}
