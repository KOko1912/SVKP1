// backend/server.js
require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

// Solo arranca el servidor. /uploads y /health ya están en app.js
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
