import { runMysql, runSql } from "../config/db.js";

/* 
  syntax: localhost:3000/api/vendors/search?q=alex
  API LOGIN: localhost:3000/api/vendors/search?q=<name, custid, email, contact, address>
*/

export async function searchVendor(req, res) {
  try {
    const q = (req.query.q || '').trim(); //log(q);
    const sql = `select code from vendors where code like '${q}%';`;
    const rows = await runMysql(sql);
    res.json({ ok: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Items search error:', error);
    res.status(500).json({ ok: false, message: 'Internal Server Error' });
  }
}

/* 
  syntax: http://localhost:5000/api/employee/search?q=<emp name>
  http://localhost:5000/api/employee/search?q=amy
  http://localhost:5000/api/employee/search?q=a
*/
export async function searchEmployee(req, res) {
  try {
    const q = (req.query.q || '').trim(); //log(q);
    let sql = `
      select 
        name, rv_code
      from employees
      where is_active = true and name like '%${q}%';
    `;
    let rows = await runMysql(sql, [q]);
    res.json({ ok: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Items search error:', error);
    res.status(500).json({ ok: false, message: 'Internal Server Error' });
  }
}

/* 
  syntax: http://localhost:5000/api/inventory/search?v=<vendor name>&q=<item name>
  http://localhost:5000/api/inventory/search?v=best&q=chair

  seach directly by itemid
  
  http://localhost:5000/api/inventory/search/itemid
  example http://localhost:5000/api/inventory/search/469365

  http://localhost:5000/api/inventory/search?q=itemid
  example http://localhost:5000/api/inventory/search?q=1127886
  
*/
export async function seachItems(req, res) {
  try {
    const q = (req.query.q || '').trim();
    const v = (req.query.v || '').trim();
    const itemid = req.params?.itemid;

    let sql = `
      select 
        vendor,
        item_id_1 as itemId,
        sku,
        description,
        s1,
        s2,
        _999 as \`999\`,
        item_prc_2 as item_price,
        item_status
      from viewinvmasterreport
      where 1=1
    `;

    const values = [];

    if (itemid) {
      sql += ` and item_id_1 = ?`;
      values.push(itemid);
    } else {
      if (v) {
        sql += ` and vendor = ?`;
        values.push(v);
      }

      if (q) {
        sql += `
          and (
            sku like ?
            or description like ?
            or item_id_1 like ?
          )
        `;
        values.push(`%${q}%`, `%${q}%`, `${q}%`);
      }

      sql += ` limit 25`;
    }

    const rows = await runMysql(sql, values);
    res.json({ ok: true, count: rows.length, data: rows });

  } catch (error) {
    console.error('Items search error:', error);
    res.status(500).json({ ok: false, message: 'Internal Server Error' });
  }
}

/* base query
SELECT 
    a.[item_vend_id]        AS [vendor],
    a.[item_id_1]           AS [itemId],
    a.[item_desc]           AS [sku],
    a.[item_desc_2]         AS [description],
    a.[Available (Loc#1)]   AS [s1],
    a.[Available (Loc#1)]   AS [s2],
    a.[Available (Loc#999)] AS [_999],
    b.[item_prc_1]          AS [item_price],
    c.[ItemStatus]          AS [item_status]
FROM InvMasterReport a
    LEFT JOIN ItemMaster b ON a.[item_id] = b.[item_id]
    LEFT JOIN (
    SELECT [ItemID], [ItemStatus]
    FROM SalesItemDetail
    GROUP BY [ItemID], [ItemStatus]
    ) c ON c.[ItemID] = a.[item_id_1]        
ORDER BY a.[item_desc];
*/

export async function seachItems_(req, res) {
  try {
    const q = (req.query.q || '').trim();
    const v = (req.query.v || '').trim();
    const itemid = req.params?.itemid;

    let sql = '';
    const values = [];

    if (itemid) {
      // 🔹 Single item lookup
      sql = `
        SELECT
          a.[item_vend_id]        AS [vendor],
          a.[item_id_1]           AS [itemId],
          a.[item_desc]           AS [sku],
          a.[item_desc_2]         AS [description],
          a.[Available (Loc#1)]   AS [s1],
          a.[Available (Loc#1)]   AS [s2],
          a.[Available (Loc#999)] AS [999],
          b.[item_prc_1]          AS [item_price],
          b.[item_prc_2]          AS [item_price_2],
          b.[item_prc_3]          AS [item_price_3],
          c.[ItemStatus]          AS [item_status]
        FROM [InvMasterReport] a
          LEFT JOIN [ItemMaster] b
            ON a.[item_id] = b.[item_id]
          LEFT JOIN (
            SELECT [ItemID], [ItemStatus]
            FROM [SalesItemDetail]
            GROUP BY [ItemID], [ItemStatus]
          ) c
            ON c.[ItemID] = a.[item_id_1]
        WHERE a.[item_id_1] = ?
      `;

      values.push(itemid);

    } else {
      // 🔹 Search mode
      sql = `
        SELECT TOP (25)
          a.[item_vend_id]        AS [vendor],
          a.[item_id_1]           AS [itemId],
          a.[item_desc]           AS [sku],
          a.[item_desc_2]         AS [description],
          a.[Available (Loc#1)]   AS [s1],
          a.[Available (Loc#1)]   AS [s2],
          a.[Available (Loc#999)] AS [999],
          b.[item_prc_1]          AS [item_price],
          b.[item_prc_2]          AS [item_price_2],
          b.[item_prc_3]          AS [item_price_3],
          c.[ItemStatus]          AS [item_status]
        FROM [InvMasterReport] a
          LEFT JOIN [ItemMaster] b
            ON a.[item_id] = b.[item_id]
          LEFT JOIN (
            SELECT [ItemID], [ItemStatus]
            FROM [SalesItemDetail]
            GROUP BY [ItemID], [ItemStatus]
          ) c
            ON c.[ItemID] = a.[item_id_1]
        WHERE 1 = 1
      `;

      if (v) {
        sql += ` AND a.[item_vend_id] = ?`;
        values.push(v);
      }

      if (q) {
        sql += `
          AND (
            a.[item_desc]     LIKE '%' + ? + '%'
            OR a.[item_desc_2] LIKE '%' + ? + '%'
            OR a.[item_id_1]   LIKE ? + '%'
          )
        `;
        values.push(q, q, q);
      }

      sql += ` ORDER BY a.[item_desc]`;
    }

    const rows = await runSql(sql, values);

    res.json({
      ok: true,
      count: rows.length,
      data: rows
    });

  } catch (error) {
    console.error('Items search error:', error);
    res.status(500).json({
      ok: false,
      message: 'Internal Server Error'
    });
  }
}

/* 
  API: localhost:3000/api/customers/search?q=alex
  API LOGIN: localhost:3000/api/customers/search?q=<name, custid, email, contact, address>
*/
export async function searchCustomer(req, res) {
  try {
    const q = (req.query.q || '').trim(); //log(q);

    if (!q) {
      return res.status(400).json({ ok: false, message: "Query parameter 'q' is required." });
    }

    // Build the wildcard once and reuse
    const like = `${q}%`;

    const sql = `
      SELECT TOP (20)
        TRY_CAST(cust_id AS INT) AS cust_id,
        LTRIM(SUBSTRING(cust_nam, CHARINDEX('|', cust_nam) + 1, LEN(cust_nam))) AS cust_name,
        cust_st_1 AS address_1,
        cust_st_2 AS address_2,
        cust_city   AS city,
        cust_state  AS state,
        cust_zip_cod AS zipcode,
        cust_email  AS email,
        cust_phone_no   AS phone_1,
        cust_phone_no_2 AS phone_2
      FROM dbo.CustMaster
      WHERE
        (
          cust_id LIKE ?
          OR LTRIM(SUBSTRING(cust_nam, CHARINDEX('|', cust_nam) + 1, LEN(cust_nam))) LIKE ?
          OR cust_st_1 LIKE ?
          OR cust_st_2 LIKE ?
          OR cust_email LIKE ?
          OR cust_phone_no LIKE ?
          OR cust_phone_no_2 LIKE ?
        )
      ORDER BY
        LTRIM(SUBSTRING(cust_nam, CHARINDEX('|', cust_nam) + 1, LEN(cust_nam))) ASC,
        cust_id ASC;
    `;

    const rows = await runSql(sql, [like, like, like, like, like, like, like]);
    res.json({ ok: true, count: rows.length, data: rows });
  } catch (err) {
    console.error('Customer search error:', err);
    res.status(500).json({ ok: false, message: 'Internal Server Error' });
  }
};


export async function zipCodeDeleveires(req, res){
  try {
    const zipcode = req.params;
    if(!zipcode) throw { status: 'ok', data: [], message: 'Inalid/Missing Zipcode' }
    const sql = `
      select * from DeliveryMaster where ZIPCode = '${zipcode.zipcode}';
    `
    const rows = await runSql(sql, []);
    res.json({status: 'ok', data: rows, message: `Showing Result form Zipcode ${zipcode.zipcode}`});
  } catch (error) {
    res.json(error);
    log(error);
  }
}

