const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const outpassRoutes = require('./routes/outpassRoutes');
const gateRoutes = require('./routes/gateRoutes');
const adminRoutes = require('./routes/adminRoutes');
const commonRoutes = require('./routes/commonRoutes');
const healthRoutes = require('./routes/healthRoutes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// Security Headers & CORS
app.use(helmet());
app.use(
  cors({
    origin: '*', // In production can restrict to frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-scanner-code', 'x-api-key', 'x-gate-code']
  })
);

// Body Parsers & Request Logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/outpasses', outpassRoutes);
app.use('/api/gate', gateRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', commonRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
