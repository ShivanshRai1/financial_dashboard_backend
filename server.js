// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend requests
app.use(cors());

// MySQL connection setup (uses .env for DB_PASSWORD)
const connection = mysql.createConnection({
  host: 'mysql-27aceb02-dashboard01.k.aivencloud.com',
  port: 26127,
  user: 'avnadmin',
  password: process.env.DB_PASSWORD || '',
  database: 'financial_dashboard',
  ssl: {
    ca: fs.readFileSync(path.join(__dirname, 'ca.pem')),
  },
});

// API: Get all financial data
app.get('/api/financial-data', (req, res) => {
  connection.query('SELECT * FROM financial_data', (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// API: Get individual company components
app.get('/api/individual-company-components', (req, res) => {
  connection.query('SELECT * FROM individual_company_components', (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// API: Get live stock price from Twelve Data
app.get('/api/stock-price/:ticker', async (req, res) => {
  const ticker = req.params.ticker;
  // Use Twelve Data API key from .env if available
  const apiKey = process.env.TWELVE_DATA_API_KEY || '73491e879df54ff7967dd39d1c3f3c77';
  const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Twelve Data price' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
