require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(cors()); // Allow requests from the frontend

const connection = mysql.createConnection({
  host: 'mysql-27aceb02-dashboard01.k.aivencloud.com',
  port: 26127,
  user: 'avnadmin',
  password: process.env.DB_PASSWORD || '', // Set your DB password in environment variable
  database: 'financial_dashboard',
  ssl: {
    ca: fs.readFileSync(path.join(__dirname, 'ca.pem')),
  }
});

// API endpoint for financial data
app.get('/api/financial-data', (req, res) => {
  connection.query('SELECT * FROM financial_data', (err, results) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    res.json(results);
  });
});

// API endpoint for individual_company_components
app.get('/api/individual-company-components', (req, res) => {
  connection.query('SELECT * FROM individual_company_components', (err, results) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    res.json(results);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
