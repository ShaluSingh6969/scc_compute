-- MariaDB setup script for SmartCityCloud telemetry application
-- The MariaDB image creates the database and application user from Compose
-- environment variables. This file is for application schema only.

USE tucdrive;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(150) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
