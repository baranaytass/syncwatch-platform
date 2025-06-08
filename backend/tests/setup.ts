import { Pool } from 'pg';
import { createClient } from 'redis';

// Test database configuration
const testDbConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: Number(process.env.TEST_DB_PORT) || 5432,
  database: process.env.TEST_DB_NAME || 'syncwatch_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
};

// Test Redis configuration
const testRedisConfig = {
  host: process.env.TEST_REDIS_HOST || 'localhost',
  port: Number(process.env.TEST_REDIS_PORT) || 6379,
};

export let testPool: Pool;
export let testRedis: any;

// Setup function for tests
export const setupTestDatabase = async (): Promise<void> => {
  // Create test database connection
  testPool = new Pool({
    ...testDbConfig,
    max: 5, // Smaller pool for tests
  });

  // Create test Redis connection
  testRedis = createClient({
    socket: {
      host: testRedisConfig.host,
      port: testRedisConfig.port,
    },
  });

  try {
    // Test database connection
    const client = await testPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Test database connected');

    // Connect to Redis
    await testRedis.connect();
    await testRedis.ping();
    console.log('✅ Test Redis connected');

    // Create test tables
    await createTestTables();

  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
};

// Cleanup function for tests
export const cleanupTestDatabase = async (): Promise<void> => {
  try {
    if (testRedis && testRedis.isOpen) {
      await testRedis.flushAll();
      await testRedis.quit();
    }

    if (testPool) {
      await testPool.end();
    }

    console.log('✅ Test database cleaned up');
  } catch (error) {
    console.error('❌ Test database cleanup failed:', error);
    throw error;
  }
};

// Create test tables
const createTestTables = async (): Promise<void> => {
  const client = await testPool.connect();
  
  try {
    // Create sessions table for tests
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('WAITING', 'ACTIVE', 'ENDED')),
        participants JSONB NOT NULL DEFAULT '[]',
        video_url TEXT,
        video_state JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_test_sessions_status ON sessions(status);
    `);

    console.log('✅ Test tables created');
  } finally {
    client.release();
  }
};

// Clean test data between tests
export const cleanTestData = async (): Promise<void> => {
  const client = await testPool.connect();
  
  try {
    await client.query('DELETE FROM sessions');
    await testRedis.flushAll();
  } finally {
    client.release();
  }
};

// Global test setup
beforeAll(async () => {
  await setupTestDatabase();
});

// Global test cleanup
afterAll(async () => {
  await cleanupTestDatabase();
});

// Clean data before each test
beforeEach(async () => {
  await cleanTestData();
}); 