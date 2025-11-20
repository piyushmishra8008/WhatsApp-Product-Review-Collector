require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pool = require('./db');        // the db.js we created
const MessagingResponse = require('twilio').twiml.MessagingResponse;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

const userState = {};
pool.connect()
  .then(client => {
    console.log('✅ Connected to Supabase/Postgres!');
    client.release();
  })
  .catch(err => {
    console.error('❌ DB connection failed:', err.stack);
  });
  app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ DB test successful:', result.rows[0].now);
    res.json({ message: 'DB connected!', time: result.rows[0].now });
  } catch (err) {
    console.error('❌ DB test failed:', err.stack);
    res.status(500).json({ error: 'DB connection failed' });
  }
});

app.post('/whatsapp', async (req, res) => {
  try {
    const msg = req.body.Body;
    const from = req.body.From;

    const twiml = new MessagingResponse();

    if (!userState[from]) {
      userState[from] = { step: 1 };
      twiml.message('Which product is this review for?');
      return res.send(twiml.toString());
    }

    const state = userState[from].step;

    if (state === 1) {
      userState[from].product_name = msg;
      userState[from].step = 2;
      twiml.message("What's your name?");
      return res.send(twiml.toString());
    }

    if (state === 2) {
      userState[from].user_name = msg;
      userState[from].step = 3;
      twiml.message(`Please send your review for ${userState[from].product_name}.`);
      return res.send(twiml.toString());
    }

    if (state === 3) {
      const product = userState[from].product_name;
      const name = userState[from].user_name;

      await pool.query(
        `INSERT INTO reviews (contact_number, user_name, product_name, product_review)
         VALUES ($1, $2, $3, $4)`,
        [from, name, product, msg]
      );

      twiml.message(`Thanks ${name} — your review for ${product} has been recorded.`);
      delete userState[from];
      return res.send(twiml.toString());
    }
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).send('Server error');
  }
});

app.get('/api/reviews', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/reviews error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
