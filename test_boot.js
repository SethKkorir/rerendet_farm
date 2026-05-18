console.log('START');
import express from 'express';
console.log('EXPRESS');
const app = express();
app.get('/', (req, res) => res.send('OK'));
app.listen(5004, () => console.log('LISTEN 5004'));
