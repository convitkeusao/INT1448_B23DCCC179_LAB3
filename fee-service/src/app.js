const express = require('express');
const feeRoutes = require('./routes/fee.routes');

const app = express();

app.use(express.json());
app.use(feeRoutes);
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  console.error('Fee Service error:', error);
  return res.status(500).json({ error: 'Lỗi nội bộ Fee Service.' });
});

module.exports = app;