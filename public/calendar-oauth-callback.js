(() => {
  const query = new URLSearchParams(location.search);
  const state = query.get('state');
  const code = query.get('code');
  const validState = query.getAll('state').length === 1 && /^[A-Za-z0-9_-]{43}$/.test(state || '');
  const validCode = query.getAll('code').length === 1 && /^[!-~]{1,2048}$/.test(code || '');
  history.replaceState(null, '', location.pathname);
  const status = document.getElementById('calendar-oauth-status');
  if (!validState || typeof BroadcastChannel !== 'function') {
    status.textContent = 'Return to the workspace and restart Calendar authorization.';
    return;
  }
  const channel = new BroadcastChannel('abgm1-calendar-oauth:' + state);
  channel.postMessage(validCode && !query.has('error') ? { code } : { denied: true });
  channel.close();
  status.textContent = 'Return to the workspace to review the Calendar connection.';
  window.close();
})();
