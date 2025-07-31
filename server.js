require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const cors = require('cors');

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
    ca: fs.readFileSync(require('path').join(__dirname, 'ca.pem')),
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


// Free stock data API using Finnhub
const axios = require('axios');

// Example: https://finnhub.io/api/v1/quote?symbol=AAPL&token=API_KEY
app.get('/api/stock/:ticker', async (req, res) => {
  const ticker = req.params.ticker;
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Finnhub API key not set in .env' });
  }
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`;
    const response = await axios.get(url);
    const data = response.data;
    if (data && typeof data.c === 'number' && !isNaN(data.c)) {
      // c: current price, d: change, dp: percent change, t: timestamp
      res.json({
        symbol: ticker,
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        lastUpdated: data.t ? new Date(data.t * 1000).toLocaleDateString() : null
      });
    } else {
      console.error('Finnhub API returned no price for', ticker, data);
      res.status(404).json({ error: 'Ticker not found or no price data' });
    }
  } catch (err) {
    console.error('Error fetching stock data from Finnhub:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Headers:', JSON.stringify(err.response.headers));
      console.error('Data:', JSON.stringify(err.response.data));
    } else if (err.request) {
      console.error('No response received:', err.request);
    } else {
      console.error('Error config:', err.config);
    }
    console.error('Full error stack:', err.stack);
    res.status(500).json({ error: 'Failed to fetch stock data', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
