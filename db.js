const { Pool } = require('pg');
const { parse } = require('pg-connection-string');

const config = parse(process.env.DATABASE_URL);
config.ssl = { rejectUnauthorized: false };
config.host = 'db.dsrberumydpnflbjynbs.supabase.co'; // force hostname
config.family = 4; // ✅ force IPv4

const pool = new Pool(config);

module.exports = pool;
