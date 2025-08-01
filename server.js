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
// Helper: Map tickers for Finnhub (add exchange suffixes if needed)
function mapTickerForFinnhub(ticker) {
  // Add more mappings as needed for international tickers
  const mapping = {
    '6963.T': '6963.T', // Tokyo
    'IFX.DE': 'IFX.DE', // XETRA
    'VSH': 'VSH',
    'ON': 'ON',
    'TXN': 'TXN',
    'ADI': 'ADI',
    // fallback: return as is
  };
  return mapping[ticker] || ticker;
}

// Example: https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL
app.get('/api/stock/:ticker', async (req, res) => {
  const ticker = req.params.ticker;
  const mappedTicker = mapTickerForFinnhub(ticker);
  const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(mappedTicker)}`;
  try {
    const yahooResp = await axios.get(yahooUrl);
    const quote = yahooResp.data.quoteResponse.result[0];
    if (quote && typeof quote.regularMarketPrice === 'number') {
      return res.json({
        symbol: quote.symbol,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        lastUpdated: quote.regularMarketTime ? new Date(quote.regularMarketTime * 1000).toLocaleDateString() : null
      });
    } else {
      return res.status(404).json({ error: 'Ticker not found or no price data (Yahoo Finance)' });
    }
  } catch (err) {
    console.error('Yahoo Finance error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch stock data from Yahoo Finance', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
