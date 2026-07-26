const express = require('express');
const bodyParser = require('body-parser');
const smmRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// SMM marshrutlari
app.use('/smm', smmRoutes);

// Server ishga tushishi
app.listen(PORT, () => {
    console.log(`SMM AI Panel serveri ${PORT} portda ishga tushdi.`);
});