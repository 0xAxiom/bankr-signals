#!/usr/bin/env node

/**
 * Apply referral system migration
 * Creates the necessary database tables for the referral system
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

async function applyMigration() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '002_referral_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Applying referral system migration...');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    
    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('referrals', 'referral_registrations', 'referral_rewards')
      ORDER BY table_name
    `);
    
    console.log('📊 Created tables:');
    result.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();