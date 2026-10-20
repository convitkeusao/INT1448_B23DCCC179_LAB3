const app = require('./app');
const { port } = require('./config/env');
const statsService = require('./services/stats.service');

const server = app.listen(port, () => {
  console.log(`Bank Service đang chạy tại http://localhost:${port}`);
});

server.keepAliveTimeout = 5000;
server.headersTimeout = 6000;
server.on('connection', (socket) => {
  statsService.recordConnection();
  console.log(`TCP connection mới từ ${socket.remoteAddress}:${socket.remotePort}`);
});