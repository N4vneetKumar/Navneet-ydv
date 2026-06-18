require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

module.exports = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  geoFenceRadiusMeters: 100,
  disputeWindowMinutes: 5,
  otpTtlMinutes: 10,
  weightFlagThreshold: 0.5,
};
