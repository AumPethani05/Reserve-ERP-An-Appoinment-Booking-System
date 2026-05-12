-- VaidyaLink Database Schema
-- Run this on a fresh PostgreSQL database to initialize all tables.
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.

-- Users
CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  email            VARCHAR NOT NULL,
  phone            VARCHAR NOT NULL,
  password_hash    VARCHAR NOT NULL,
  full_name        VARCHAR NOT NULL,
  role             VARCHAR NOT NULL DEFAULT 'patient',
  is_verified      BOOLEAN NOT NULL DEFAULT false,
  avatar_url       VARCHAR,
  otp_code         VARCHAR,
  otp_expires_at   TIMESTAMPTZ,
  otp_attempts     INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);

-- Providers (businesses)
CREATE TABLE IF NOT EXISTS providers (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id),
  business_name    VARCHAR NOT NULL,
  category         VARCHAR NOT NULL DEFAULT 'other',
  specialty        VARCHAR NOT NULL,
  description      TEXT,
  address          VARCHAR,
  city             VARCHAR,
  state            VARCHAR,
  zip_code         VARCHAR,
  phone            VARCHAR,
  email            VARCHAR,
  website          VARCHAR,
  consultation_fee NUMERIC,
  rating           NUMERIC NOT NULL DEFAULT 0,
  total_reviews    INTEGER NOT NULL DEFAULT 0,
  avatar_url       VARCHAR,
  is_onboarded     BOOLEAN NOT NULL DEFAULT false,
  is_approved      BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Resources (bookable units: turfs, chairs, rooms, lanes, etc.)
CREATE TABLE IF NOT EXISTS resources (
  id               SERIAL PRIMARY KEY,
  provider_id      INTEGER NOT NULL REFERENCES providers(id),
  name             VARCHAR NOT NULL,
  type             VARCHAR NOT NULL,
  description      TEXT,
  capacity         INTEGER DEFAULT 1,
  color            TEXT DEFAULT '#0d9488',
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT resources_type_check CHECK (
    type IN ('turf','court','room','chair','lane','station','seat','table','bay','field','equipment','staff','other')
  )
);

-- Services / packages offered by a provider
CREATE TABLE IF NOT EXISTS services (
  id               SERIAL PRIMARY KEY,
  provider_id      INTEGER NOT NULL REFERENCES providers(id),
  name             VARCHAR NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price            NUMERIC NOT NULL,
  description      TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Weekly schedules (one row per day-of-week per provider)
CREATE TABLE IF NOT EXISTS schedules (
  id               SERIAL PRIMARY KEY,
  provider_id      INTEGER NOT NULL REFERENCES providers(id),
  day_of_week      INTEGER NOT NULL,  -- 0=Sunday … 6=Saturday
  start_time       VARCHAR NOT NULL,  -- HH:MM
  end_time         VARCHAR NOT NULL,  -- HH:MM
  slot_duration    INTEGER NOT NULL DEFAULT 30,  -- minutes
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time slots (pre-generated availability)
CREATE TABLE IF NOT EXISTS slots (
  id               SERIAL PRIMARY KEY,
  provider_id      INTEGER NOT NULL REFERENCES providers(id),
  service_id       INTEGER REFERENCES services(id),
  resource_id      INTEGER REFERENCES resources(id),
  date             DATE NOT NULL,
  start_time       VARCHAR NOT NULL,  -- HH:MM
  end_time         VARCHAR NOT NULL,  -- HH:MM
  status           VARCHAR NOT NULL DEFAULT 'available',
  locked_by        INTEGER REFERENCES users(id),
  locked_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slots_provider_date_resource
  ON slots (provider_id, date, resource_id);

-- Appointments (confirmed bookings)
CREATE TABLE IF NOT EXISTS appointments (
  id                   SERIAL PRIMARY KEY,
  patient_id           INTEGER NOT NULL REFERENCES users(id),
  provider_id          INTEGER NOT NULL REFERENCES providers(id),
  slot_id              INTEGER NOT NULL REFERENCES slots(id),
  service_id           INTEGER NOT NULL REFERENCES services(id),
  resource_id          INTEGER REFERENCES resources(id),
  status               VARCHAR NOT NULL DEFAULT 'upcoming',
  notes                TEXT,
  cancellation_reason  TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices (auto-created on booking)
CREATE TABLE IF NOT EXISTS invoices (
  id                 SERIAL PRIMARY KEY,
  appointment_id     INTEGER NOT NULL REFERENCES appointments(id),
  patient_id         INTEGER NOT NULL REFERENCES users(id),
  provider_id        INTEGER NOT NULL REFERENCES providers(id),
  amount             NUMERIC NOT NULL,
  tax                NUMERIC NOT NULL DEFAULT 0,
  total              NUMERIC NOT NULL,
  status             VARCHAR NOT NULL DEFAULT 'pending',
  payment_method     VARCHAR,
  payment_reference  VARCHAR,
  paid_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
