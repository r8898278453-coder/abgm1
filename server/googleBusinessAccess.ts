const RESOURCE_ID = /^[A-Za-z0-9_-]{1,128}$/;

export function googleBusinessBinding(credentials: Record<string, unknown>) {
  const account = typeof credentials.accountId === 'string'
    ? credentials.accountId.trim().replace(/^accounts\//, '') : '';
  const location = typeof credentials.locationId === 'string'
    ? credentials.locationId.trim().replace(/^locations\//, '') : '';
  const token = typeof credentials.oauthToken === 'string' ? credentials.oauthToken.trim() : '';
  if (!RESOURCE_ID.test(account) || !RESOURCE_ID.test(location) || !/^[!-~]{1,8192}$/.test(token)) return null;
  if (credentials.expiresAt !== undefined) {
    const date = credentials.expiresAt;
    if (typeof date !== 'string' || !Number.isFinite(Date.parse(date)) || Date.parse(date) <= Date.now()) return null;
  }
  return { account, location, token };
}

/** Check read access to the exact account and a location listed under that account. */
export async function checkGoogleBusinessAccess(credentials: Record<string, unknown>, transport: typeof fetch = fetch) {
  const binding = googleBusinessBinding(credentials);
  if (!binding) return { success: false, error: 'A current OAuth access token and valid account and location IDs are required.' };
  const { account, location, token } = binding;
  const accountName = 'accounts/' + account;
  const locationName = 'locations/' + location;
  const options: RequestInit = {
    headers: { Authorization: 'Bearer ' + token },
    redirect: 'error',
    signal: AbortSignal.timeout(6000),
  };
  try {
    const response = await transport('https://mybusinessaccountmanagement.googleapis.com/v1/' + accountName, options);
    if (!response.ok || (await response.json())?.name !== accountName) {
      return { success: false, error: 'Google did not confirm read access to the selected account.' };
    }
    let pageToken = '';
    for (let page = 0; page < 5; page++) {
      const query = new URLSearchParams({ readMask: 'name', pageSize: '100' });
      if (pageToken) query.set('pageToken', pageToken);
      const locations = await transport(
        'https://mybusinessbusinessinformation.googleapis.com/v1/' + accountName + '/locations?' + query,
        options,
      );
      if (!locations.ok) return { success: false, error: 'Google did not confirm location read access.' };
      const result = await locations.json();
      if (!result || (result.locations !== undefined && !Array.isArray(result.locations))) {
        return { success: false, error: 'Google returned an invalid location list.' };
      }
      if (result.locations?.some((entry: any) => entry?.name === locationName)) {
        return { success: true, message: 'Google confirmed read access to the selected account and location.' };
      }
      const next = result.nextPageToken;
      if (typeof next !== 'string' || !next || next.length > 2048 || next === pageToken) break;
      pageToken = next;
    }
    return { success: false, error: 'The selected location could not be confirmed in this account.' };
  } catch {
    return { success: false, error: 'Google account and location verification is unavailable.' };
  }
}
