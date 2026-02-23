import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import sql from 'mssql';

dotenv.config();

/* =======================
   MYSQL CONFIG & POOL
======================= */

const mysqlConfig = {
  host: process.env.MYSQL_HOSTNAME,
  user: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWROD,
  database: process.env.MYSQL_DATABASE,
  port: 3306,
  connectionLimit: 10,
  waitForConnections: true,
};

const mysqlPool = mysql.createPool(mysqlConfig);

/**
 * Execute a MySQL query using mysql2 promise pool
 *
 * @param {string} query
 * @param {Array} values
 * @returns {Promise<Array>} rows
 */
export async function runMysql(query, values = []) {
  try {
    const [rows] = await mysqlPool.query(query, values);
    return rows;
  } catch (error) {
    console.error('❌ MySQL query error:', error.stack);
    throw error;
  }
}

/* 
  CFC FROM CONFIG
*/

const cfcFormConfig = {
  host: process.env.CFC_FORM_HOST,
  user: process.env.CFC_FORM_USER,
  password: process.env.CFC_FORM_PASSWORD,
  database: process.env.CFC_FORM_DATABASE,
  port: 3306,
  connectionLimit: 10,
  waitForConnections: true,
};

const cfcFormPool = mysql.createPool(cfcFormConfig);

/**
 * Execute a MySQL query using mysql2 promise pool
 *
 * @param {string} query
 * @param {Array} values
 * @returns {Promise<Array>} rows
 */
export async function formQuery(query, values = []) {
  try {
    const [rows] = await cfcFormPool.query(query, values);
    return rows;
  } catch (error) {
    console.error('❌ MySQL query error:', error.stack);
    throw error;
  }
}

/* =======================
   MSSQL CONFIG & POOL
======================= */

const mssqlPoolPromise = new sql.ConnectionPool({
  user: process.env.MSSQL_USERNAME,
  password: process.env.MSSQL_PASSWORD,
  server: process.env.MSSQL_HOSTNAME,
  database: process.env.MSSQL_DATABASE,
  options: {
    trustServerCertificate: true,
  },
  requestTimeout: 60000,
  connectTimeout: 30000,
}).connect();

/**
 * Run MSSQL query with ? placeholders
 */
export async function runSql(query, values = []) {
  const conn = await mssqlPoolPromise;
  const request = conn.request();

  let index = 0;
  const parsedQuery = query.replace(/\?/g, () => `@p${index++}`);

  values.forEach((val, i) => {
    request.input(`p${i}`, val);
  });

  const result = await request.query(parsedQuery);
  return result.recordset;
}

/**
 * Execute MSSQL stored procedure
 */
export async function executeProcedure(procedureName, params = {}) {
  const conn = await mssqlPoolPromise;
  const request = conn.request();

  for (const key in params) {
    request.input(key, params[key]);
  }

  const result = await request.execute(procedureName);
  return result.recordset;
}

/* =======================
   EXPORT POOLS (OPTIONAL)
======================= */

export {
  mysqlPool, // cfc api
  cfcFormPool,  // form api
  mssqlPoolPromise,
};
