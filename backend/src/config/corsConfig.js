const getAllowedOrigins = () => {
  const origins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'https://6adb4a94270b2cf54d433fe4--hostel-outpass-management.netlify.app',
    'https://hostel-outpass-management.netlify.app'
  ];

  if (process.env.CLIENT_URL) {
    process.env.CLIENT_URL.split(',').forEach((url) => {
      const trimmed = url.trim();
      if (trimmed && !origins.includes(trimmed)) {
        origins.push(trimmed);
      }
    });
  }

  return origins;
};

const isOriginAllowed = (origin) => {
  // Allow non-browser requests (e.g. mobile kiosk app, turnstile hardware scanner, curl, server-to-server)
  if (!origin) return true;

  const allowedList = getAllowedOrigins();
  if (allowedList.includes(origin)) return true;

  // Allow Netlify production & deploy preview subdomains for this specific project
  const netlifyPattern = /^https:\/\/([a-zA-Z0-9_-]+--)?hostel-outpass-management\.netlify\.app$/;
  if (netlifyPattern.test(origin)) return true;

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy violation: Origin '${origin}' is not authorized.`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-scanner-code',
    'x-api-key',
    'x-gate-code'
  ],
  credentials: true
};

module.exports = {
  corsOptions,
  isOriginAllowed,
  getAllowedOrigins
};
