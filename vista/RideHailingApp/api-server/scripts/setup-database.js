const setupDatabase = async (pool) => {
  try {
    console.log('🔧 Setting up database...');

    // Enable PostGIS extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('✅ PostGIS extension enabled');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        phone VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        user_type VARCHAR(20) CHECK (user_type IN ('rider', 'driver', 'both')) NOT NULL DEFAULT 'rider',
        is_verified BOOLEAN DEFAULT false,
        push_token TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Users table created');

    // Create drivers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        license_number VARCHAR(100) UNIQUE NOT NULL,
        is_verified BOOLEAN DEFAULT false,
        is_available BOOLEAN DEFAULT false,
        current_location GEOMETRY(POINT, 4326),
        rating DECIMAL(3,2) DEFAULT 5.0,
        total_rides INTEGER DEFAULT 0,
        vehicle_info JSONB NOT NULL,
        status VARCHAR(20) CHECK (status IN ('available', 'busy', 'offline', 'on_ride')) DEFAULT 'offline',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Drivers table created');

    // Create rides table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rides (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        rider_id UUID NOT NULL REFERENCES users(id),
        driver_id UUID REFERENCES drivers(id),
        pickup_location JSONB NOT NULL,
        destination_location JSONB NOT NULL,
        status VARCHAR(20) CHECK (status IN ('requested', 'accepted', 'arriving', 'driver_arriving', 'in_progress', 'completed', 'cancelled')) DEFAULT 'requested',
        fare DECIMAL(10,2) NOT NULL,
        distance DECIMAL(10,2) NOT NULL,
        estimated_duration INTEGER NOT NULL,
        ride_type VARCHAR(20) CHECK (ride_type IN ('economy', 'comfort', 'premium', 'xl')) NOT NULL,
        payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'digital_wallet', 'razorpay')) NOT NULL,
        payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        notes TEXT,
        pickup_address TEXT,
        destination_address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        accepted_at TIMESTAMP WITH TIME ZONE,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        cancelled_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Rides table created');

    // Create ride tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ride_tracking (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
        driver_location GEOMETRY(POINT, 4326) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        speed DECIMAL(5,2),
        heading DECIMAL(5,2)
      );
    `);
    console.log('✅ Ride tracking table created');

    // Create user sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ User sessions table created');

    // Create payments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        ride_id UUID NOT NULL REFERENCES rides(id),
        user_id UUID NOT NULL REFERENCES users(id),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'INR',
        payment_method VARCHAR(50),
        payment_gateway VARCHAR(50),
        gateway_transaction_id TEXT,
        status VARCHAR(20) CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Payments table created');

    // Create ride requests table (for real-time matching)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ride_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        rider_id UUID NOT NULL REFERENCES users(id),
        pickup_location GEOMETRY(POINT, 4326) NOT NULL,
        destination_location GEOMETRY(POINT, 4326) NOT NULL,
        ride_type VARCHAR(20) NOT NULL,
        max_fare DECIMAL(10,2),
        status VARCHAR(20) CHECK (status IN ('active', 'matched', 'cancelled', 'expired')) DEFAULT 'active',
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Ride requests table created');

    // Create indexes for better performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers USING GIST(current_location);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_drivers_available ON drivers(is_available) WHERE is_available = true;');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_rides_rider ON rides(rider_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_ride_tracking_ride ON ride_tracking(ride_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_ride_tracking_timestamp ON ride_tracking(timestamp);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_payments_ride ON payments(ride_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_ride_requests_location ON ride_requests USING GIST(pickup_location);');
    console.log('✅ Database indexes created');

    // Create trigger function for updated_at
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers for updated_at
    const tables = ['users', 'drivers', 'rides', 'payments'];
    for (const table of tables) {
      await pool.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at 
          BEFORE UPDATE ON ${table} 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    }
    console.log('✅ Database triggers created');

    console.log('🎉 Database setup completed successfully!');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
};

module.exports = setupDatabase;