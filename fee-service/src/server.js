const app = require('./app');
const { port } = require('./config/env');

app.listen(port, () => {
  console.log(`Fee Service đang chạy tại http://localhost:${port}`);
});