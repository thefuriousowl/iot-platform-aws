// Local dev — points at the ingestion/API services port-forwarded from the cluster.
export const environment = {
  production: false,
  apiBase: 'http://localhost:3000/api',
  wsBase: 'ws://localhost:3001',
};
