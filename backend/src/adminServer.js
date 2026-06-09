require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const path = require('path');
const auth = require('./auth');
const adminRouter = require('./routes/admin');

const app = express();
app.use(cors());
app.use(helmet());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/admin', auth, adminRouter);

const PORT = process.env.ADMIN_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Meals admin server listening on ${PORT}`);
});
