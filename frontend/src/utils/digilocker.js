/**
 * DigiLocker deep-link helpers.
 *
 * Pure functions — no React, no I/O — so they can be unit-tested without a
 * native runtime. `deepLinkParser` extracts the `code` / `state` / `error`
 * query params from whatever URI the OS hands back after the driver grants
 * consent on digilocker.gov.in.
 *
 * DigiLocker returns the citizen to the registered `redirect_uri`. Two shapes
 * are accepted:
 *   digilockerapp://callback?code=abc&state=xyz      (custom scheme, mobile)
 *   https://<host>/callback?code=abc&state=xyz      (universal/app link)
 *
 * Anything else (including a bare `digilocker://` informational URI, which
 * DigiLocker uses for "no documents issued") returns `null` so the caller can
 * fall back to the retry path instead of crashing.
 */

/** Scheme the app registers for the redirect. Kept in app.json + eas.json. */
export const DIGILOCKER_REDIRECT_SCHEME = 'digilockerapp';

/** Path DigiLocker appends after the scheme. */
export const DIGILOCKER_CALLBACK_HOST = 'callback';

/**
 * True when `url` looks like the DigiLocker consent return trip.
 * Accepts custom-scheme + https forms so a universal link works unchanged.
 */
export function isDigiLockerCallbackUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith(`${DIGILOCKER_REDIRECT_SCHEME}://`)) {
    if (!url.startsWith('https://') && !url.startsWith('http://')) return false;
  }
  // Must reference the registered callback path.
  return url.includes(`${DIGILOCKER_CALLBACK_HOST}?`) || url.includes(`${DIGILOCKER_CALLBACK_HOST}/`);
}

/**
 * Pull `code` / `state` / `error` out of the callback URI.
 *
 * @returns {{code: string|null, state: string|null, error: string|null}|null}
 *          `null` when the URI is not a DigiLocker callback.
 */
export function parseDigiLockerCallback(url) {
  if (!isDigiLockerCallbackUrl(url)) return null;

  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) return { code: null, state: null, error: null };

  const params = new URLSearchParams(url.slice(queryIndex + 1));

  return {
    code: params.get('code'),
    state: params.get('state'),
    // DigiLocker reports citizen denial as `error=access_denied`.
    error: params.get('error'),
  };
}

/**
 * Backend error codes we can turn into a driver-friendly message.
 * Anything else falls through to the generic retry copy.
 */
const FRIENDLY_ERRORS = {
  DIGILOCKER_DISABLED:
    'DigiLocker verification is not enabled for your organisation. Please contact your fleet manager.',
  DIGILOCKER_BAD_STATE:
    'The verification link was malformed. Please try again.',
  DIGILOCKER_STATE_EXPIRED:
    'The verification request timed out. Please tap Verify again.',
  DIGILOCKER_STATE_NOT_FOUND:
    'This verification request is no longer valid. Please tap Verify again.',
  DIGILOCKER_STATE_MISMATCH:
    'This verification link belongs to a different login. Please sign in again and retry.',
  DIGILOCKER_MISSING_CODE:
    'DigiLocker did not return an authorisation code. Please try again.',
  DIGILOCKER_TOKEN_EXCHANGE_FAILED:
    'DigiLocker could not confirm your consent. Please try again.',
  DIGILOCKER_DOC_FETCH_FAILED:
    'We could not fetch your documents from DigiLocker. Please try again.',
  DIGILOCKER_NOT_CONFIGURED:
    'DigiLocker verification is not set up for your organisation. Please contact your fleet manager.',
};

/**
 * Map an axios/Sentry ApiError (from services/api.js) into a message + the
 * backend `code` when we can read it. `ApiError` only carries `message`, so we
 * accept the raw object and let the caller pass `error?.code` if available.
 *
 * @param {{message?: string, code?: string, statusCode?: number}} error
 * @param {'en'|'hi'} language
 * @returns {{code: string|null, message: string}}
 */
export function friendlyDigiLockerError(error, language = 'en') {
  const code = error?.code ?? null;

  if (code && FRIENDLY_ERRORS[code]) {
    return { code, message: FRIENDLY_ERRORS[code] };
  }

  // The backend surfaces `503` for the disabled integration.
  if (error?.statusCode === 503) {
    return {
      code: code || 'DIGILOCKER_DISABLED',
      message: FRIENDLY_ERRORS.DIGILOCKER_DISABLED,
    };
  }

  const fallbackEn =
    'We could not verify your document with DigiLocker right now. Please try again.';
  const fallbackHi =
    'अभी DigiLocker से आपके दस्तावेज़ सत्यापित नहीं हो सके। कृपया पुनः प्रयास करें।';

  return { code, message: language === 'hi' ? fallbackHi : fallbackEn };
}