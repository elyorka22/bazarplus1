/**
 * Client auth helpers: access token is held in memory (see auth-tokens),
 * refresh token is httpOnly (set by /api/auth/* routes).
 */
export {
  bootstrapSession,
  loginWithPassword,
  logoutRequest,
  registerAccount,
} from "./auth-client";
export {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "./auth-tokens";
