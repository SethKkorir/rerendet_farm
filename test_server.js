
import express from 'express';
const app = express();
const PORT = 5006;
app.get('/', (req, res) => res.send('OK'));
app.listen(PORT, () => {
  console.log(`🚀 TEST SERVER RUNNING ON PORT ${PORT}`);
  process.exit(0);
});
