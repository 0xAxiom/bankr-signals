#!/usr/bin/env node
/**
 * Comprehensive Site Health Check for Bankr Signals
 * Tests all critical endpoints and functionality
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

const SITE_URL = 'https://bankrsignals.com';
const LOCAL_URL = 'http://localhost:3000';

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: timeout,
      headers: {
        'User-Agent': 'BankrSignals-HealthCheck/1.0'
      }
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          responseTime: Date.now() - startTime
        });
      });
    });

    const startTime = Date.now();
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.setTimeout(timeout);
    req.end();
  });
}

async function checkEndpoint(name, path, expectedStatus = 200) {
  try {
    const response = await makeRequest(`${SITE_URL}${path}`);
    
    if (response.statusCode === expectedStatus) {
      log(`✅ ${name}: ${response.responseTime}ms`, 'green');
      return { name, status: 'pass', responseTime: response.responseTime, statusCode: response.statusCode };
    } else {
      log(`❌ ${name}: Expected ${expectedStatus}, got ${response.statusCode}`, 'red');
      return { name, status: 'fail', responseTime: response.responseTime, statusCode: response.statusCode };
    }
  } catch (error) {
    log(`💥 ${name}: ${error.message}`, 'red');
    return { name, status: 'error', error: error.message };
  }
}

async function checkAPI(name, path, method = 'GET') {
  try {
    const response = await makeRequest(`${SITE_URL}${path}`);
    
    // API endpoints should return JSON
    let jsonData = null;
    try {
      jsonData = JSON.parse(response.data);
    } catch (e) {
      log(`⚠️  ${name}: Invalid JSON response`, 'yellow');
      return { name, status: 'warning', responseTime: response.responseTime, issue: 'Invalid JSON' };
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      log(`✅ ${name}: ${response.responseTime}ms`, 'green');
      return { name, status: 'pass', responseTime: response.responseTime, hasData: !!jsonData };
    } else {
      log(`❌ ${name}: Status ${response.statusCode}`, 'red');
      return { name, status: 'fail', statusCode: response.statusCode, responseTime: response.responseTime };
    }
  } catch (error) {
    log(`💥 ${name}: ${error.message}`, 'red');
    return { name, status: 'error', error: error.message };
  }
}

async function runHealthCheck() {
  log('🏥 Bankr Signals Health Check', 'bold');
  log('================================\n', 'blue');

  const results = {
    timestamp: new Date().toISOString(),
    overall: 'unknown',
    pages: [],
    apis: [],
    summary: {}
  };

  // Check main pages
  log('📄 Checking Main Pages:', 'blue');
  const pageChecks = [
    ['Homepage', '/'],
    ['Leaderboard', '/leaderboard'],
    ['Feed', '/feed'],
    ['Register', '/register'],
    ['Onboard', '/onboard'],
    ['Trends', '/trends'],
    ['Pulse', '/pulse'],
    ['Docs (SKILL.md)', '/skill.md'],
    ['Heartbeat', '/heartbeat.md']
  ];

  for (const [name, path] of pageChecks) {
    const result = await checkEndpoint(name, path);
    results.pages.push(result);
  }

  log('\n📡 Checking API Endpoints:', 'blue');
  const apiChecks = [
    ['Providers List', '/api/providers'],
    ['Signals List', '/api/signals'],
    ['Signal of Day', '/api/signal-of-day'],
    ['Leaderboard API', '/api/leaderboard'],
    ['Feed API', '/api/feed'],
    ['Stats API', '/api/stats'],
    ['Trends API', '/api/trends'],
    ['Weekly Pulse API', '/api/weekly-pulse']
  ];

  for (const [name, path] of apiChecks) {
    const result = await checkAPI(name, path);
    results.apis.push(result);
  }

  // Check non-JSON endpoints separately
  log('\n📜 Checking Script Endpoints:', 'blue');
  const scriptChecks = [
    ['Onboard Script', '/api/register-script?name=TestAgent&address=0x742d35Cc6634C0532925a3b8D581C16E1c77c86e']
  ];

  for (const [name, path] of scriptChecks) {
    const result = await checkEndpoint(name, path);
    results.apis.push(result);
  }

  // Calculate summary
  const allChecks = [...results.pages, ...results.apis];
  const passed = allChecks.filter(r => r.status === 'pass').length;
  const failed = allChecks.filter(r => r.status === 'fail').length;
  const errors = allChecks.filter(r => r.status === 'error').length;
  const warnings = allChecks.filter(r => r.status === 'warning').length;

  results.summary = {
    total: allChecks.length,
    passed,
    failed,
    errors,
    warnings,
    successRate: Math.round((passed / allChecks.length) * 100),
    avgResponseTime: Math.round(
      allChecks
        .filter(r => r.responseTime)
        .reduce((sum, r) => sum + r.responseTime, 0) /
      allChecks.filter(r => r.responseTime).length
    )
  };

  // Determine overall status
  if (errors > 0 || failed > allChecks.length / 2) {
    results.overall = 'critical';
  } else if (failed > 0 || warnings > 0) {
    results.overall = 'warning';
  } else {
    results.overall = 'healthy';
  }

  // Print summary
  log('\n📊 Health Check Summary:', 'bold');
  log(`Overall Status: ${results.overall.toUpperCase()}`, 
      results.overall === 'healthy' ? 'green' : 
      results.overall === 'warning' ? 'yellow' : 'red');
  log(`Success Rate: ${results.summary.successRate}%`);
  log(`Average Response Time: ${results.summary.avgResponseTime}ms`);
  log(`Checks: ${passed} passed, ${failed} failed, ${errors} errors, ${warnings} warnings`);

  // Recommendations
  if (results.overall !== 'healthy') {
    log('\n🔧 Recommended Actions:', 'yellow');
    
    if (failed > 0) {
      log('• Fix failed endpoints to restore full functionality');
    }
    if (errors > 0) {
      log('• Investigate connection errors - may indicate server issues');
    }
    if (results.summary.avgResponseTime > 3000) {
      log('• Optimize response times - currently slower than ideal');
    }
    
    const failedChecks = allChecks.filter(r => r.status === 'fail' || r.status === 'error');
    if (failedChecks.length > 0) {
      log('\nFailed checks:');
      failedChecks.forEach(check => {
        log(`  • ${check.name}: ${check.error || `Status ${check.statusCode}`}`, 'red');
      });
    }
  }

  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `health-check-${timestamp}.json`;
  
  try {
    const fs = await import('fs/promises');
    await fs.writeFile(filename, JSON.stringify(results, null, 2));
    log(`\n💾 Results saved to: ${filename}`, 'blue');
  } catch (error) {
    log(`⚠️  Failed to save results: ${error.message}`, 'yellow');
  }

  return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runHealthCheck()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      log(`💥 Health check failed: ${error.message}`, 'red');
      process.exit(1);
    });
}

export { runHealthCheck };