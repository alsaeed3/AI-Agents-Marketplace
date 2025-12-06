module.exports = {
  reactStrictMode: true,
  output: 'standalone', // Required for Docker deployment
  env: {
    DATABASE_URL: process.env.DATABASE_URL || 'path/to/mock_database.json',
  },
};