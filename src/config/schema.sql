-- CREATE DATABASE `cfc_form`;
-- create USER if not EXISTS form_user@'%' IDENTIFIED BY 'cfc@123456';
-- GRANT ALL PRIVILEGES ON cfc_form.* TO form_user@'%' WITH GRANT OPTION;

CREATE TABLE invoices_archive (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(100) UNIQUE,
  invoice_type VARCHAR(10),
  editable BOOLEAN DEFAULT FALSE,
  form_json LONGTEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


- 1️⃣ customers
CREATE TABLE customers (
  customer_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  primary_name VARCHAR(100) NOT NULL,
  secondary_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_name ON customers(primary_name);

-- 2️⃣ customer_contacts
CREATE TABLE customer_contacts (
  contact_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  customer_id BIGINT NOT NULL,
  type ENUM('cell','home','email') NOT NULL,
  value VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE INDEX idx_contacts_customer ON customer_contacts(customer_id);

-- 3️⃣ addresses
CREATE TABLE addresses (
  address_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  address1 VARCHAR(255),
  address2 VARCHAR(255),
  city VARCHAR(100),
  state CHAR(2),
  zip CHAR(5)
);

-- 4️⃣ customer_addresses
CREATE TABLE customer_addresses (
  customer_address_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  customer_id BIGINT NOT NULL,
  address_id BIGINT NOT NULL,
  address_type ENUM('BILL_TO','SHIP_TO') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  FOREIGN KEY (address_id) REFERENCES addresses(address_id)
);

-- 5️⃣ stores
CREATE TABLE stores (
  store_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  store_code VARCHAR(10) UNIQUE,
  store_name VARCHAR(100)
);

-- 6️⃣ employees
CREATE TABLE employees (
  employee_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  role ENUM('SALESPERSON','MANAGER','ADMIN'),
  store_id BIGINT,
  FOREIGN KEY (store_id) REFERENCES stores(store_id)
);

-- 7️⃣ invoices
CREATE TABLE invoices (
  invoice_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  invoice_number VARCHAR(50) UNIQUE,
  customer_id BIGINT NOT NULL,
  store_id BIGINT NOT NULL,
  status ENUM('QUOTE','COMPLETED','CANCELLED'),
  created_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  subtotal DECIMAL(10,2),
  tax DECIMAL(10,2),
  delivery_charge DECIMAL(10,2),
  total DECIMAL(10,2),
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  FOREIGN KEY (store_id) REFERENCES stores(store_id),
  FOREIGN KEY (created_by) REFERENCES employees(employee_id)
);

CREATE INDEX idx_invoice_customer ON invoices(customer_id);
CREATE INDEX idx_invoice_store ON invoices(store_id);
CREATE INDEX idx_invoice_status ON invoices(status);

-- 8️⃣ invoice_salespersons
CREATE TABLE invoice_salespersons (
  invoice_id BIGINT,
  employee_id BIGINT,
  PRIMARY KEY (invoice_id, employee_id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id),
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

-- 9️⃣ products
CREATE TABLE products (
  product_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  sku VARCHAR(50),
  vendor VARCHAR(50),
  description TEXT,
  grade VARCHAR(20),
  cover VARCHAR(20)
);

-- 🔟 invoice_items
CREATE TABLE invoice_items (
  invoice_item_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  invoice_id BIGINT NOT NULL,
  product_snapshot JSON NOT NULL,
  quantity INT,
  sale_price DECIMAL(10,2),
  extended_price DECIMAL(10,2),
  order_type VARCHAR(30),
  FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id)
);

-- 1️⃣1️⃣ payments
CREATE TABLE payments (
  payment_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  invoice_id BIGINT NOT NULL,
  payment_method ENUM('CASH','CHECK','VISA','MC','DISCOVER','GIFT','FINANCE'),
  amount DECIMAL(10,2),
  approved_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id),
  FOREIGN KEY (approved_by) REFERENCES employees(employee_id)
);


SHOW tables;

