const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ridehailing',
  user: process.env.DB_USER || 'ridehailing_user',
  password: process.env.DB_PASSWORD || 'your_secure_password',
};

// Admin connection (for creating database if needed)
const adminConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.DB_ADMIN_PASSWORD || '',
};

console.log('🚀 Initializing Ride Hailing Database...\n');

async function createDatabaseIfNotExists() {
  const adminPool = new Pool(adminConfig);
  
  try {
    // Check if database exists
    const result = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbConfig.database]
    );
    
    if (result.rows.length === 0) {
      console.log(`📊 Creating database: ${dbConfig.database}`);
      await adminPool.query(`CREATE DATABASE ${dbConfig.database}`);
      console.log('✅ Database created successfully');
    } else {
      console.log(`📊 Database ${dbConfig.database} already exists`);
    }
    
    // Check if user exists
    const userResult = await adminPool.query(
      "SELECT 1 FROM pg_roles WHERE rolname = $1",
      [dbConfig.user]
    );
    
    if (userResult.rows.length === 0) {
      console.log(`👤 Creating user: ${dbConfig.user}`);
      await adminPool.query(
        `CREATE USER ${dbConfig.user} WITH PASSWORD '${dbConfig.password}'`
      );
      await adminPool.query(
        `GRANT ALL PRIVILEGES ON DATABASE ${dbConfig.database} TO ${dbConfig.user}`
      );
      console.log('✅ User created successfully');
    } else {
      console.log(`👤 User ${dbConfig.user} already exists`);
    }
  } catch (error) {
    console.error('❌ Error creating database/user:', error.message);
  } finally {
    await adminPool.end();
  }
}

async function initializeDatabase() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('\n🔧 Setting up database extensions and tables...');
    
    // Enable PostGIS extension
    console.log('📍 Enabling PostGIS extension...');
    await pool.query('CREATE EXTENSION IF NOT EXISTS postgis');
    await pool.query('CREATE EXTENSION IF NOT EXISTS postgis_topology');
    
    // Verify PostGIS installation
    const postgisVersion = await pool.query('SELECT PostGIS_Version()');
    console.log(`✅ PostGIS version: ${postgisVersion.rows[0].postgis_version}`);
    
    // Create main application tables
    console.log('📋 Creating application tables...');
    
    // Users table
    await pool.query(`
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
      )
    `);
    console.log('✅ Users table created');
    
    // Drivers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        license_number VARCHAR(50) UNIQUE NOT NULL,
        is_verified BOOLEAN DEFAULT false,
        is_available BOOLEAN DEFAULT false,
        current_location JSONB,
        rating DECIMAL(3,2) DEFAULT 0.0,
        total_rides INTEGER DEFAULT 0,
        vehicle_info JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Drivers table created');
    
    // Rides table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rider_id UUID NOT NULL REFERENCES users(id),
        driver_id UUID REFERENCES users(id),
        pickup_location JSONB NOT NULL,
        dropoff_location JSONB NOT NULL,
        pickup_address TEXT,
        dropoff_address TEXT,
        ride_type VARCHAR(20) DEFAULT 'economy',
        status VARCHAR(20) DEFAULT 'pending',
        fare_amount DECIMAL(10,2),
        distance_km DECIMAL(8,2),
        duration_minutes INTEGER,
        payment_status VARCHAR(20) DEFAULT 'pending',
        payment_method VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Rides table created');
    
    // User sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ User sessions table created');
    
    // Ride tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ride_tracking (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
        driver_location JSONB,
        rider_location JSONB,
        status VARCHAR(50),
        eta_minutes INTEGER,
        distance_to_pickup_km DECIMAL(8,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Ride tracking table created');
    
    // Payments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'INR',
        payment_method VARCHAR(50) NOT NULL,
        razorpay_order_id VARCHAR(100),
        razorpay_payment_id VARCHAR(100),
        razorpay_signature VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Payments table created');
    
    // OTP sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS otp_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(15) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        attempts INTEGER DEFAULT 0,
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ OTP sessions table created');
    
    // Phone verifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS phone_verifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(15) UNIQUE NOT NULL,
        verified BOOLEAN DEFAULT false,
        first_verified_at TIMESTAMP WITH TIME ZONE,
        last_verified_at TIMESTAMP WITH TIME ZONE,
        verification_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Phone verifications table created');
    
    // PostGIS spatial tables
    console.log('🗺️ Creating spatial tables...');
    
    // Driver locations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS driver_locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        location GEOMETRY(POINT, 4326) NOT NULL,
        heading REAL,
        speed REAL,
        accuracy REAL,
        altitude REAL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Driver locations table created');
    
    // Ride locations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ride_locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
        location GEOMETRY(POINT, 4326) NOT NULL,
        location_type VARCHAR(20) CHECK (location_type IN ('pickup', 'dropoff', 'waypoint', 'current')) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Ride locations table created');
    
    // Geofences table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS geofences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        zone_type VARCHAR(50) NOT NULL,
        geometry GEOMETRY(POLYGON, 4326) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Geofences table created');
    
    // Create indexes
    console.log('📊 Creating database indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_drivers_available ON drivers(is_available) WHERE is_available = true',
      'CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status)',
      'CREATE INDEX IF NOT EXISTS idx_rides_rider ON rides(rider_id)',
      'CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id)',
      'CREATE INDEX IF NOT EXISTS idx_rides_created ON rides(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_payments_ride ON payments(ride_id)',
      'CREATE INDEX IF NOT EXISTS idx_otp_sessions_phone ON otp_sessions(phone)',
      'CREATE INDEX IF NOT EXISTS idx_otp_sessions_expires_at ON otp_sessions(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone)',
      // Spatial indexes
      'CREATE INDEX IF NOT EXISTS idx_driver_locations_gist ON driver_locations USING GIST(location)',
      'CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_time ON driver_locations(driver_id, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_ride_locations_gist ON ride_locations USING GIST(location)',
      'CREATE INDEX IF NOT EXISTS idx_geofences_gist ON geofences USING GIST(geometry)',
      'CREATE INDEX IF NOT EXISTS idx_active_driver_locations ON driver_locations USING GIST(location) WHERE is_active = true AND created_at > NOW() - INTERVAL \'10 minutes\'',
    ];
    
    for (const indexSQL of indexes) {
      await pool.query(indexSQL);
    }
    console.log('✅ Database indexes created');
    
    // Create stored functions
    console.log('⚡ Creating stored functions...');
    
    // Function to update driver location
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_driver_location(
        p_driver_id UUID,
        p_lat DOUBLE PRECISION,
        p_lng DOUBLE PRECISION,
        p_heading REAL DEFAULT NULL,
        p_speed REAL DEFAULT NULL,
        p_accuracy REAL DEFAULT NULL,
        p_altitude REAL DEFAULT NULL
      ) RETURNS UUID AS $$
      DECLARE
        location_id UUID;
      BEGIN
        -- Deactivate old locations
        UPDATE driver_locations 
        SET is_active = false 
        WHERE driver_id = p_driver_id AND is_active = true;
        
        -- Insert new location
        INSERT INTO driver_locations (
          driver_id, location, heading, speed, accuracy, altitude
        ) VALUES (
          p_driver_id, 
          ST_Point(p_lng, p_lat), 
          p_heading, 
          p_speed, 
          p_accuracy, 
          p_altitude
        ) RETURNING id INTO location_id;
        
        RETURN location_id;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Function to find nearby drivers
    await pool.query(`
      CREATE OR REPLACE FUNCTION find_nearby_drivers(
        p_lat DOUBLE PRECISION,
        p_lng DOUBLE PRECISION,
        p_radius_km DOUBLE PRECISION DEFAULT 5.0,
        p_limit INTEGER DEFAULT 10
      ) RETURNS TABLE(
        driver_id UUID,
        driver_name VARCHAR(255),
        distance_meters DOUBLE PRECISION,
        heading REAL,
        speed REAL,
        last_seen TIMESTAMP WITH TIME ZONE
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          d.id,
          u.name,
          ST_Distance(dl.location::geography, ST_Point(p_lng, p_lat)::geography) as distance_meters,
          dl.heading,
          dl.speed,
          dl.created_at
        FROM drivers d
        JOIN users u ON d.id = u.id
        JOIN driver_locations dl ON d.id = dl.driver_id
        WHERE d.is_available = true 
          AND d.is_verified = true
          AND dl.is_active = true
          AND dl.created_at > NOW() - INTERVAL '5 minutes'
          AND ST_DWithin(
            dl.location::geography, 
            ST_Point(p_lng, p_lat)::geography, 
            p_radius_km * 1000
          )
        ORDER BY distance_meters
        LIMIT p_limit;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ Stored functions created');
    
    // Verify table creation
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Created tables:');
    tables.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });
    
    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📊 Database Statistics:');
    console.log(`  🗄️ Database: ${dbConfig.database}`);
    console.log(`  📋 Tables: ${tables.rows.length}`);
    console.log(`  🗺️ PostGIS: Enabled`);
    console.log(`  🔍 Spatial Indexes: Created`);
    console.log(`  ⚡ Functions: Created`);
    
  } catch (error) {
    console.error('\n❌ Error initializing database:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function main() {
  try {
    await createDatabaseIfNotExists();
    await initializeDatabase();
    console.log('\n✅ Setup complete! You can now start the application.');
    console.log('\nNext steps:');
    console.log('  1. npm start        # Start the mobile app');
    console.log('  2. npm run start:websocket  # Start WebSocket server');
    console.log('  3. Configure your .env file with API keys');
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the initialization
if (require.main === module) {
  main();
}

module.exports = { initializeDatabase, createDatabaseIfNotExists };