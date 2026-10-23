const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const setupSocketIO = (io) => {
  io.on('connection', (socket) => {
    // Client joins room based on role or user id
    socket.on('authenticate', (token) => {
      try {
        if (!token) return;
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.userId;
        socket.role = decoded.role;

        socket.join(`user_${decoded.userId}`);
        socket.join(`role_${decoded.role}`);
      } catch (err) {
        // Invalid token, ignore
      }
    });

    socket.on('join_gate_kiosk', (gateCode) => {
      if (gateCode) {
        socket.join(`gate_${gateCode.toUpperCase()}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });
};

module.exports = setupSocketIO;
