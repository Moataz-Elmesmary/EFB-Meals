require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const db = require('./db');
const sqlListener = require('./sqlListener');

const requestsRouter = require('./routes/requests');
const kitchenRouter = require('./routes/kitchen');
const sapRouter = require('./routes/sap');

const app = express();
app.use(cors());
app.use(helmet());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api', requestsRouter);
app.use('/api/kitchen', kitchenRouter);
app.use('/api/sap', sapRouter);

const staticPath = path.join(__dirname, '..', 'public');
if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return res.status(404).send('Not found');
    }
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Meals backend listening on port ${PORT}`);
  sqlListener.start();
});

