// This configuration is used in development mode
// npm run build && npm run develop

module.exports = ({ env }) => ({
  host: '0.0.0.0',
  port: 1337,
  url: 'http://localhost:1337',
  stripePrivateKey: env('STRIPE_PRIVATE_KEY'),
  stripeEndpointSecret: env('STRIPE_ENDPOINT_SECRET'),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET'),
    },
  },
});
