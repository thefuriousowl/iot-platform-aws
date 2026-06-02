// Production — same-origin behind the ALB; the ingress routes /api and /stream.
export const environment = {
  production: true,
  apiBase: '/api',
  wsBase: `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`,
};
