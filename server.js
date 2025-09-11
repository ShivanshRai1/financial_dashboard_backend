require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS so frontend can access the API
app.use(cors());

// Set up MySQL database connection with SSL
const connection = mysql.createConnection({
  host: 'mysql-27aceb02-dashboard01.k.aivencloud.com',
  port: 26127,
  user: 'avnadmin',
  password: process.env.DB_PASSWORD || '', // Use password from .env file
  database: 'financial_dashboard',
  ssl: {
    ca: fs.readFileSync(path.join(__dirname, 'ca.pem')), // SSL certificate for secure connection
  }
});

// API endpoint for fetching all financial data
app.get('/api/financial-data', (req, res) => {
  connection.query('SELECT * FROM financial_data', (err, results) => {
    if (err) {
      // Log and send error if query fails
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    // Send query results as JSON
    res.json(results);
  });
});

// API endpoint for fetching individual company components
app.get('/api/individual-company-components', (req, res) => {
  connection.query('SELECT * FROM individual_company_components', (err, results) => {
    if (err) {
      // Log and send error if query fails
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    // Send query results as JSON
    res.json(results);
  });
});

// API endpoint for fetching Yahoo Finance data via RapidAPI
app.get('/api/yahoo-quote/:ticker', async (req, res) => {
  const ticker = req.params.ticker;
  const url = `https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=${encodeURIComponent(ticker)}&region=US`;
  try {
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': '73dbb4f6damsh60fde03d26db142p1bf479jsn3859a1da0743',
        'X-RapidAPI-Host': 'yh-finance.p.rapidapi.com'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Yahoo Finance data' });
  }
});

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
