const express = require('express');
const bankRoutes = require('./routes/bank.routes');

const app = express();

app.use(express.json());
app.use(bankRoutes);
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  console.error('Bank Service error:', error);
  return res.status(500).json({ error: 'Lỗi nội bộ Bank Service.' });
});

module.exports = app;