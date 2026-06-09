const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const db = require('./db');

const requestsRouter = require('./routes/requests');
const kitchenRouter = require('./routes/kitchen');
const sapRouter = require('./routes/sap');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api', requestsRouter);
app.use('/api/kitchen', kitchenRouter);
app.use('/api/sap', sapRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Meals backend listening on ${PORT}`);
});
