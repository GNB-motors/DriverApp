import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  extra: {
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8000/api',
  },
});
