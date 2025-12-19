const express = require('express');
const app = express();
const PORT = process.env.PORT || 5001;

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
