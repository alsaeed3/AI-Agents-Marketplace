module.exports = {
  reactStrictMode: true,
  env: {
    DATABASE_URL: process.env.DATABASE_URL || 'path/to/mock_database.json',
  },
};