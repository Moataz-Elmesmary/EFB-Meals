const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const adminRouter = require('./routes/admin');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/admin', adminRouter);

const PORT = process.env.ADMIN_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Meals admin server listening on ${PORT}`);
});
