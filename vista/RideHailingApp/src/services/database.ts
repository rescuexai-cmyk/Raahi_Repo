import { Pool, PoolConfig } from 'pg';
import AsyncStorage from '@react-native-async-storage/async-storage';

// PostgreSQL connection configuration
const dbConfig: PoolConfig = {
  host: process.env.EXPO_PUBLIC_DB_HOST || 'localhost',
  port: parseInt(process.env.EXPO_PUBLIC_DB_PORT || '5432'),
  database: process.env.EXPO_PUBLIC_DB_NAME || 'ridehailing',
  user: process.env.EXPO_PUBLIC_DB_USER || 'postgres',
  password: process.env.EXPO_PUBLIC_DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create PostgreSQL connection pool
export const pool = new Pool(dbConfig);

// Database query wrapper with error handling
export const query = async (text: string, params?: any[]): Promise<any> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return { data: res.rows, error: null };
  } catch (error: any) {
    console.error('Database query error:', error);
    return { data: null, error: error.message };
  }
};

// Transaction wrapper
export const transaction = async (callback: (client: any) => Promise<any>) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return { data: result, error: null };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error);
    return { data: null, error: error.message };
  } finally {
    client.release();
  }
};

// Initialize database tables
export const initializeDatabase = async () => {
  const createTablesSQL = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone VARCHAR(20) UNIQUE NOT NULL,
      email VARCHAR(255),
      name VARCHAR(255) NOT NULL,
      avatar_url TEXT,
      user_type VARCHAR(20) CHECK (user_type IN ('rider', 'driver')) NOT NULL,
      is_verified BOOLEAN DEFAULT false,
      push_token TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Drivers table (extends users)
    CREATE TABLE IF NOT EXISTS drivers (
      id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      license_number VARCHAR(100) UNIQUE NOT NULL,
      is_verified BOOLEAN DEFAULT false,
      is_available BOOLEAN DEFAULT false,
      current_location JSONB,
      rating DECIMAL(3,2) DEFAULT 5.0,
      total_rides INTEGER DEFAULT 0,
      vehicle_info JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Rides table
    CREATE TABLE IF NOT EXISTS rides (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rider_id UUID NOT NULL REFERENCES users(id),
      driver_id UUID REFERENCES drivers(id),
      pickup_location JSONB NOT NULL,
      destination_location JSONB NOT NULL,
      status VARCHAR(20) CHECK (status IN ('requested', 'accepted', 'arriving', 'in_progress', 'completed', 'cancelled')) DEFAULT 'requested',
      fare DECIMAL(10,2) NOT NULL,
      distance DECIMAL(10,2) NOT NULL,
      estimated_duration INTEGER NOT NULL,
      ride_type VARCHAR(20) CHECK (ride_type IN ('economy', 'comfort', 'premium', 'xl')) NOT NULL,
      payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'digital_wallet', 'razorpay')) NOT NULL,
      payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      accepted_at TIMESTAMP WITH TIME ZONE,
      started_at TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE,
      cancelled_at TIMESTAMP WITH TIME ZONE,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Ride tracking table for real-time location updates
    CREATE TABLE IF NOT EXISTS ride_tracking (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
      driver_location JSONB NOT NULL,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      speed DECIMAL(5,2),
      heading DECIMAL(5,2)
    );

    -- User sessions table for authentication
    CREATE TABLE IF NOT EXISTS user_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers USING GIN(current_location);
    CREATE INDEX IF NOT EXISTS idx_drivers_available ON drivers(is_available) WHERE is_available = true;
    CREATE INDEX IF NOT EXISTS idx_rides_rider ON rides(rider_id);
    CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id);
    CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
    CREATE INDEX IF NOT EXISTS idx_ride_tracking_ride ON ride_tracking(ride_id);
    CREATE INDEX IF NOT EXISTS idx_ride_tracking_timestamp ON ride_tracking(timestamp);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token);

    -- Create trigger to update updated_at column
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at 
      BEFORE UPDATE ON users 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
    CREATE TRIGGER update_drivers_updated_at 
      BEFORE UPDATE ON drivers 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_rides_updated_at ON rides;
    CREATE TRIGGER update_rides_updated_at 
      BEFORE UPDATE ON rides 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `;

  return await query(createTablesSQL);
};

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('Database connected successfully:', result.data?.[0]?.current_time);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

// Close database connections
export const closePool = async () => {
  await pool.end();
};

// Export database object for backward compatibility
export const database = {
  query,
  transaction,
  pool,
  initializeDatabase,
  testConnection,
  closePool
};