// Local development entry point: connects to MongoDB and listens on a port.
// On Vercel this file is not used; api/index.js uses app.js directly.
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 5000;

async function start() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Copy backend/.env.example to backend/.env');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
