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


// Free stock data API using Yahoo Finance (unofficial, via yfinance API)
const axios = require('axios');

// Example: https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL
app.get('/api/stock/:ticker', async (req, res) => {
  const ticker = req.params.ticker;
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}`;
    const response = await axios.get(url);
    const quote = response.data.quoteResponse.result[0];
    if (!quote) {
      return res.status(404).json({ error: 'Ticker not found' });
    }
    res.json({
      symbol: quote.symbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      lastUpdated: new Date(quote.regularMarketTime * 1000).toLocaleDateString()
    });
  } catch (err) {
    console.error('Error fetching stock data:', err.message);
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});