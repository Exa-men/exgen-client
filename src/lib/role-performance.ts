// Role performance monitoring utility
// This helps track the performance improvements from Phase 1

interface RolePerformanceMetrics {
  totalApiCalls: number;
  cacheHits: number;
  cacheMisses: number;
  duplicateRequests: number;
  averageResponseTime: number;
  lastUpdated: number;
}

class RolePerformanceMonitor {
  private metrics: RolePerformanceMetrics = {
    totalApiCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    duplicateRequests: 0,
    averageResponseTime: 0,
    lastUpdated: Date.now()
  };

  private responseTimes: number[] = [];

  // Track API call
  trackApiCall() {
    this.metrics.totalApiCalls++;
    this.metrics.lastUpdated = Date.now();
  }

  // Track cache hit
  trackCacheHit() {
    this.metrics.cacheHits++;
    this.metrics.lastUpdated = Date.now();
  }

  // Track cache miss
  trackCacheMiss() {
    this.metrics.cacheMisses++;
    this.metrics.lastUpdated = Date.now();
  }

  // Track duplicate request
  trackDuplicateRequest() {
    this.metrics.duplicateRequests++;
    this.metrics.lastUpdated = Date.now();
  }

  // Track response time
  trackResponseTime(responseTime: number) {
    this.responseTimes.push(responseTime);
    // Keep only last 10 response times for average calculation
    if (this.responseTimes.length > 10) {
      this.responseTimes.shift();
    }
    
    this.metrics.averageResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
  }

  // Get current metrics
  getMetrics(): RolePerformanceMetrics {
    return { ...this.metrics };
  }

  // Get cache hit rate
  getCacheHitRate(): number {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    return total > 0 ? (this.metrics.cacheHits / total) * 100 : 0;
  }

  // Get performance summary
  getPerformanceSummary(): string {
    const summary = {
      totalRoles: this.roles.length,
      activeRoles: this.roles.filter(role => role.isActive).length,
      totalUsers: this.users.length,
      activeUsers: this.users.filter(user => user.isActive).length,
      averageCredits: this.calculateAverageCredits(),
      totalCredits: this.calculateTotalCredits(),
      creditDistribution: this.getCreditDistribution(),
      roleEfficiency: this.calculateRoleEfficiency(),
      userEngagement: this.calculateUserEngagement(),
      systemHealth: this.calculateSystemHealth()
    };

    return JSON.stringify(summary, null, 2);
  }

  // Reset metrics
  reset() {
    this.metrics = {
      totalApiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      duplicateRequests: 0,
      averageResponseTime: 0,
      lastUpdated: Date.now()
    };
    this.responseTimes = [];
  }

  // Export metrics to console
  logMetrics() {
    // console.log('🔍 Role Performance Metrics:');
    // console.log(this.getPerformanceSummary());
  }
}

// Create singleton instance
export const rolePerformanceMonitor = new RolePerformanceMonitor();

// Utility functions for easy tracking
export const trackRoleApiCall = () => rolePerformanceMonitor.trackApiCall();
export const trackRoleCacheHit = () => rolePerformanceMonitor.trackCacheHit();
export const trackRoleCacheMiss = () => rolePerformanceMonitor.trackCacheMiss();
export const trackRoleDuplicateRequest = () => rolePerformanceMonitor.trackDuplicateRequest();
export const trackRoleResponseTime = (time: number) => rolePerformanceMonitor.trackResponseTime(time);
export const getRolePerformanceMetrics = () => rolePerformanceMonitor.getMetrics();
export const logRolePerformance = () => rolePerformanceMonitor.logMetrics();
export const resetRolePerformance = () => rolePerformanceMonitor.reset();
