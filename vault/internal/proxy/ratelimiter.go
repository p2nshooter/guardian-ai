/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
package proxy

import (
	"sync"
	"time"
)

// RateLimiter implements a sliding window rate limiter
type RateLimiter struct {
	mu          sync.Mutex
	requests    []time.Time
	maxRequests int
	window      time.Duration
}

func NewRateLimiter(maxRequests int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		requests:    make([]time.Time, 0, maxRequests),
		maxRequests: maxRequests,
		window:      window,
	}
}

func (rl *RateLimiter) Allow() bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	// Remove expired entries
	valid := rl.requests[:0]
	for _, t := range rl.requests {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}
	rl.requests = valid

	if len(rl.requests) >= rl.maxRequests {
		return false
	}

	rl.requests = append(rl.requests, now)
	return true
}

func (rl *RateLimiter) Count() int {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	return len(rl.requests)
}
