import { NextRequest, NextResponse } from 'next/server';

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'error' | 'warning';
  responseTime?: number;
  statusCode?: number;
  error?: string;
  hasData?: boolean;
}

interface HealthResults {
  timestamp: string;
  overall: 'healthy' | 'warning' | 'critical';
  pages: HealthCheck[];
  apis: HealthCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    errors: number;
    warnings: number;
    successRate: number;
    avgResponseTime: number;
  };
}

async function checkEndpoint(url: string, name: string, expectedStatus = 200): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BankrSignals-HealthCheck/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.status === expectedStatus) {
      return { 
        name, 
        status: 'pass', 
        responseTime, 
        statusCode: response.status 
      };
    } else {
      return { 
        name, 
        status: 'fail', 
        responseTime, 
        statusCode: response.status 
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return { 
      name, 
      status: 'error', 
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function checkAPI(url: string, name: string): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BankrSignals-HealthCheck/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    // Try to parse JSON to validate API response
    let hasValidJson = false;
    try {
      const text = await response.text();
      JSON.parse(text);
      hasValidJson = true;
    } catch (e) {
      // Not valid JSON, might be a warning but not necessarily a failure
    }
    
    if (response.status >= 200 && response.status < 300) {
      if (!hasValidJson) {
        return { 
          name, 
          status: 'warning', 
          responseTime, 
          statusCode: response.status,
          error: 'Invalid JSON response'
        };
      }
      return { 
        name, 
        status: 'pass', 
        responseTime, 
        statusCode: response.status,
        hasData: hasValidJson
      };
    } else {
      return { 
        name, 
        status: 'fail', 
        responseTime, 
        statusCode: response.status 
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return { 
      name, 
      status: 'error', 
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const baseUrl = request.url.replace('/api/health-check', '');
    
    // Define checks to perform
    const pageChecks = [
      { name: 'Homepage', path: '/' },
      { name: 'Leaderboard', path: '/leaderboard' },
      { name: 'Feed', path: '/feed' },
      { name: 'Register', path: '/register' },
      { name: 'Onboard', path: '/onboard' },
      { name: 'Trends', path: '/trends' },
      { name: 'Pulse', path: '/pulse' },
      { name: 'Docs (SKILL.md)', path: '/skill.md' },
      { name: 'Heartbeat', path: '/heartbeat.md' }
    ];

    const apiChecks = [
      { name: 'Providers List', path: '/api/providers' },
      { name: 'Signals List', path: '/api/signals' },
      { name: 'Signal of Day', path: '/api/signal-of-the-day' },
      { name: 'Leaderboard API', path: '/api/leaderboard' },
      { name: 'Feed API', path: '/api/feed' },
      { name: 'Stats API', path: '/api/stats' },
      { name: 'Trends API', path: '/api/trends' },
      { name: 'Weekly Pulse API', path: '/api/weekly-pulse' },
      { name: 'Onboard Script', path: '/api/onboard' }
    ];

    // Run all checks in parallel
    const pageResults = await Promise.all(
      pageChecks.map(check => 
        checkEndpoint(`${baseUrl}${check.path}`, check.name)
      )
    );

    const apiResults = await Promise.all(
      apiChecks.map(check => 
        checkAPI(`${baseUrl}${check.path}`, check.name)
      )
    );

    // Calculate summary
    const allChecks = [...pageResults, ...apiResults];
    const passed = allChecks.filter(r => r.status === 'pass').length;
    const failed = allChecks.filter(r => r.status === 'fail').length;
    const errors = allChecks.filter(r => r.status === 'error').length;
    const warnings = allChecks.filter(r => r.status === 'warning').length;

    const summary = {
      total: allChecks.length,
      passed,
      failed,
      errors,
      warnings,
      successRate: Math.round((passed / allChecks.length) * 100),
      avgResponseTime: Math.round(
        allChecks
          .filter(r => r.responseTime)
          .reduce((sum, r) => sum + (r.responseTime || 0), 0) /
        allChecks.filter(r => r.responseTime).length
      )
    };

    // Determine overall status
    let overall: 'healthy' | 'warning' | 'critical';
    if (errors > 0 || failed > allChecks.length / 2) {
      overall = 'critical';
    } else if (failed > 0 || warnings > 0) {
      overall = 'warning';
    } else {
      overall = 'healthy';
    }

    const results: HealthResults = {
      timestamp: new Date().toISOString(),
      overall,
      pages: pageResults,
      apis: apiResults,
      summary
    };

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed'
    }, { status: 500 });
  }
}