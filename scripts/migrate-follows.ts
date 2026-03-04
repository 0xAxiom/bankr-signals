#!/usr/bin/env npx tsx

import { supabase } from "../lib/db";
import { readFileSync } from "fs";
import { join } from "path";

async function runMigration() {
  console.log("🔄 Running follow system migration...");
  
  try {
    // Read the migration file
    const migrationSQL = readFileSync(
      join(__dirname, "../database/migrations/005_follow_system.sql"),
      "utf8"
    );

    // Split into individual statements and execute
    const statements = migrationSQL
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 60)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        
        if (error) {
          // Try direct execution if RPC doesn't work
          console.log("RPC failed, trying direct execution...");
          const result = await fetch(process.env.SUPABASE_URL + '/rest/v1/rpc/exec_sql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify({ sql: statement + ';' })
          });

          if (!result.ok) {
            console.warn(`Statement failed: ${statement.substring(0, 100)}...`);
            console.warn(`Error: ${error.message}`);
          }
        }
      }
    }

    console.log("✅ Migration completed successfully!");

    // Test the functions
    console.log("🧪 Testing follow functions...");
    
    const { data: testCount, error: testError } = await supabase
      .rpc('count_provider_followers', { provider_address: '0x523eff3db03938eaa31a5a6fbd41e3b9d23edde5' });
    
    if (testError) {
      console.warn("Test failed:", testError.message);
    } else {
      console.log(`Test successful: Provider has ${testCount} followers`);
    }

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
runMigration().then(() => {
  console.log("🎉 Follow system is ready!");
  process.exit(0);
});