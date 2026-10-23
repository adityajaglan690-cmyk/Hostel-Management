require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { connectDB } = require('./config/db');
const { isOriginAllowed } = require('./config/corsConfig');
const setupSocketIO = require('./socket/socketHandler');
const BackgroundJobService = require('./services/backgroundJobService');
const seedDatabase = require('./seed/seedData');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect to Database (Atlas, local, or embedded memory server)
    await connectDB();

    // 2. Auto-seed essential demo data if DB is fresh
    await seedDatabase(false);

    // 3. Create HTTP & Socket.IO Server
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: (origin, callback) => {
          if (isOriginAllowed(origin)) {
            callback(null, true);
          } else {
            callback(new Error(`Socket.IO CORS blocked for origin: ${origin}`));
          }
        },
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Make io accessible throughout controllers
    app.set('io', io);
    setupSocketIO(io);

    // 4. Start Durable Background Jobs (Every 30 seconds)
    const JOB_INTERVAL_MS = 30 * 1000;
    setInterval(() => {
      BackgroundJobService.runReconciliation(io);
    }, JOB_INTERVAL_MS);

    // Run initial reconciliation immediately
    BackgroundJobService.runReconciliation(io);

    // 5. Listen
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`[Server] Port ${PORT} is already in use. Stop the existing backend process before starting another one.`);
      } else {
        console.error('[Server] Failed to start HTTP server:', error);
      }
      process.exitCode = 1;
    });

    server.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` HOSTEL OUTPASS MANAGEMENT BACKEND ACTIVE`);
      console.log(` Port: ${PORT} | Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` Health Check: http://localhost:${PORT}/api/health`);
      console.log(`====================================================`);
    });

    return { server, io };
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = startServer;
