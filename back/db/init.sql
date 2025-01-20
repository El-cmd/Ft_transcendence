-- Create the database if it does not exist
DO $$ 
BEGIN
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '${POSTGRES_DB}') THEN
      EXECUTE 'CREATE DATABASE ${POSTGRES_DB}';
   END IF;
END
$$;

-- Create a user for the database if it does not exist
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${POSTGRES_USER}') THEN
      EXECUTE 'CREATE USER ${POSTGRES_USER} WITH ENCRYPTED PASSWORD ''${POSTGRES_PASSWORD}''';
   END IF;
END
$$;

-- Grant privileges to the user
GRANT ALL PRIVILEGES ON DATABASE ${POSTGRES_DB} TO ${POSTGRES_USER};

-- Connect to the database
\c ${POSTGRES_DB};

-- Create a table for users if it does not exist
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);