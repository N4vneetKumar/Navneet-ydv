CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'pickup_boy', 'admin')),
  address JSONB DEFAULT '{}',
  total_earnings DECIMAL(12, 2) DEFAULT 0,
  total_pickups INTEGER DEFAULT 0,
  commission_rate DECIMAL(5, 2) DEFAULT 0,
  pending_payout DECIMAL(12, 2) DEFAULT 0,
  vehicle_type VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  is_blocked BOOLEAN DEFAULT false,
  is_clocked_in BOOLEAN DEFAULT false,
  fcm_token TEXT,
  notification_enabled BOOLEAN DEFAULT true,
  firebase_uid VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Saved addresses
CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(100),
  address_line TEXT NOT NULL,
  landmark TEXT,
  gps_lat DECIMAL(10, 7),
  gps_long DECIMAL(10, 7),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rates table
CREATE TABLE IF NOT EXISTS rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  rate_per_kg DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, item_name)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id),
  assigned_boy_id UUID REFERENCES users(id),
  items JSONB NOT NULL DEFAULT '[]',
  estimated_weight DECIMAL(10, 2) NOT NULL,
  actual_weight DECIMAL(10, 2),
  total_amount DECIMAL(12, 2) DEFAULT 0,
  payment_mode VARCHAR(10) CHECK (payment_mode IN ('cash', 'upi')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'disputed')),
  customer_photo TEXT,
  scale_photo TEXT,
  vehicle_photo TEXT,
  pickup_date DATE NOT NULL,
  pickup_time_slot VARCHAR(50) NOT NULL,
  address JSONB NOT NULL,
  gps_lat DECIMAL(10, 7) NOT NULL,
  gps_long DECIMAL(10, 7) NOT NULL,
  otp_hash VARCHAR(255),
  otp_expires_at TIMESTAMPTZ,
  dispute_expires_at TIMESTAMPTZ,
  flagged BOOLEAN DEFAULT false,
  commission_amount DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_boy ON orders(assigned_boy_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_pickup_date ON orders(pickup_date);

-- Settlements (pickup boy payouts)
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_boy_id UUID NOT NULL REFERENCES users(id),
  admin_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(12, 2) NOT NULL,
  payment_mode VARCHAR(20) DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment ledger (customer earnings audit)
CREATE TABLE IF NOT EXISTS payment_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id),
  order_id UUID REFERENCES orders(id),
  amount DECIMAL(12, 2) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  customer_id UUID NOT NULL REFERENCES users(id),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Attendance (pickup boy clock in/out)
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_boy_id UUID NOT NULL REFERENCES users(id),
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_attendance_boy_date ON attendance(pickup_boy_id, date);

-- Daily revenue counter
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(14, 2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
