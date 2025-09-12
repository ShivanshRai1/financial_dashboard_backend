
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());

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

// List of companies and their CIKs
const companies = [
  { name: 'onsemi', cik: '0001097864' },
  { name: 'infineon', cik: '0001434928' },
  { name: 'vishay', cik: '0000883241' },
  { name: 'rohm', cik: '0001279026' },
  { name: 'ti', cik: '0000097476' },
  { name: 'analog', cik: '0000006281' }
];

// Metrics to extract (add more as needed)
const metricsToExtract = [
  { name: 'Revenue', key: 'revenues' },
  { name: 'Revenue QOQ', key: 'revenueqoq' },
  { name: 'Cost of Goods Sold', key: 'costofgoodssold' },
  { name: 'COGS as % of Revenue', key: 'cogsaspercentofrevenue' },
  { name: 'Gross Profit', key: 'grossprofit' },
  { name: 'Gross Margin', key: 'grossmargin' },
  { name: 'Capital Expenditure', key: 'capitalexpenditure' },
  { name: 'Research and development (R&D)', key: 'researchanddevelopment' },
  { name: 'SG&A (incl. Marketing)', key: 'sgainclmarketing' },
  { name: 'Amortization of Intangibles', key: 'amortizationofintangibles' },
  { name: 'Restructuring costs', key: 'restructuringcosts' },
  { name: 'Total operating expenses', key: 'totaloperatingexpenses' },
  { name: 'R&D as % of Revenue', key: 'rdaspercentofrevenue' },
  { name: 'SGM&A as % of Revenue', key: 'sgmaaspercentofrevenue' },
  { name: 'Operating Profit (EBIT)', key: 'operatingprofit' },
  { name: 'Interest expense', key: 'interestexpense' },
  { name: 'Interest income', key: 'interestincome' },
  { name: 'Net Profit/Income', key: 'netprofit' },
  { name: 'Net Profit Margin', key: 'netprofitmargin' },
  { name: 'Net income attributable to ON Semiconductor Corporation', key: 'netincomeattributable' },
  { name: 'Cash and cash equivalents', key: 'cashandequivalents' },
  { name: 'Short-term investments', key: 'shortterminvestments' },
  { name: 'Accounts receivable', key: 'accountsreceivable' },
  { name: 'Inventories', key: 'inventories' },
  { name: 'Inventories as a % of Revenue', key: 'inventoriesaspercentofrevenue' },
  { name: 'Total current assets', key: 'totalcurrentassets' },
  { name: 'Property, plant and equipment, net', key: 'propertyplantequipmentnet' },
  { name: 'Total assets', key: 'totalassets' },
  { name: 'Accounts payable', key: 'accountspayable' },
  { name: 'Total current liabilities', key: 'totalcurrentliabilities' },
  { name: 'Current Ratio', key: 'currentratio' },
  { name: 'Quick Ratio', key: 'quickratio' },
  { name: 'Long-term debt', key: 'longtermdebt' },
  { name: 'Total liabilities', key: 'totalliabilities' },
  { name: 'Total stockholders’ equity', key: 'totalstockholdersequity' },
  { name: 'Debt-to-Equity Ratio', key: 'debtequityratio' },
  { name: 'ROA (Return on Assets)', key: 'roa' },
  { name: 'ROE (Return on Equity)', key: 'roe' },
  { name: 'Total liabilities and stockholders’ equity', key: 'totalliabilitiesandstockholdersequity' }
];

// Helper to fetch and insert EDGAR data for all companies
async function fetchAndInsertAllCompanies() {
  for (const company of companies) {
    try {
      const url = `https://data.sec.gov/submissions/CIK${company.cik}.json`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'DashboardApp/1.0 your-email@example.com' }
      });
      if (!response.ok) {
        console.error(`Failed to fetch for ${company.name}`);
        continue;
      }
      const data = await response.json();

      // Log the fetched data as a JS object
      console.log(`Fetched EDGAR data for ${company.name}`);

      // Get recent filings
      const filings = data.filings?.recent;
      if (!filings) {
        console.warn(`No filings for ${company.name}`);
        continue;
      }
      const periods = filings.reportDate || [];
      const filingDates = filings.filingDate || [];

      // Loop through available periods
      for (let i = 0; i < periods.length; i++) {
        for (const metric of metricsToExtract) {
          let value = null;
          if (data.facts && data.facts['us-gaap'] && data.facts['us-gaap'][metric.key]) {
            const fact = data.facts['us-gaap'][metric.key];
            const periodFact = fact.units?.USD || [];
            const periodObj = periodFact.find(f => f.end === periods[i]);
            if (periodObj) value = periodObj.val;
          }
          if (value !== null) {
            // Prevent duplicates: check if already exists
            const checkQuery = 'SELECT id FROM edgar_financials WHERE company_name = ? AND cik = ? AND metric_name = ? AND period = ?';
            const checkParams = [company.name, company.cik, metric.name, periods[i]];
            await new Promise((resolve) => {
              connection.query(checkQuery, checkParams, (err, results) => {
                if (err) {
                  console.error('Check error:', err);
                  return resolve();
                }
                if (results.length > 0) {
                  console.log(`Duplicate found: ${company.name}, ${metric.name}, ${periods[i]}`);
                  return resolve();
                }
                // Insert into MySQL
                connection.query(
                  'INSERT INTO edgar_financials (company_name, cik, metric_name, metric_value, period, filing_date) VALUES (?, ?, ?, ?, ?, ?)',
                  [company.name, company.cik, metric.name, value, periods[i], filingDates[i] || null],
                  (err2, results2) => {
                    if (err2) console.error('Insert error:', err2);
                    else console.log(`Inserted: ${company.name}, ${metric.name}, ${periods[i]}, value: ${value}`);
                    resolve();
                  }
                );
              });
            });
          }
        }
      }
    } catch (err) {
      console.error(`Error for ${company.name}:`, err);
    }
  }
}


app.get('/api/update-edgar-data', async (req, res) => {
  console.log('API /api/update-edgar-data called');
  await fetchAndInsertAllCompanies();
  res.json({ status: 'Update triggered' });
});

// API: Get all financial data
app.get('/api/financial-data', (req, res) => {
  connection.query('SELECT * FROM edgar_financials', (err, results) => {
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
