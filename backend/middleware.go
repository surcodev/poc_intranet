package main

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type ipLimiter struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

var (
	limiters   = make(map[string]*ipLimiter)
	limitersMu sync.Mutex
)

func getLimiter(ip string) *rate.Limiter {
	limitersMu.Lock()
	defer limitersMu.Unlock()
	entry, ok := limiters[ip]
	if !ok {
		entry = &ipLimiter{limiter: rate.NewLimiter(10, 20)}
		limiters[ip] = entry
	}
	entry.lastSeen = time.Now()
	return entry.limiter
}

func cleanupLimiters() {
	for range time.Tick(5 * time.Minute) {
		limitersMu.Lock()
		for ip, entry := range limiters {
			if time.Since(entry.lastSeen) > 10*time.Minute {
				delete(limiters, ip)
			}
		}
		limitersMu.Unlock()
	}
}

func rateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !getLimiter(c.ClientIP()).Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "demasiadas peticiones, intente más tarde",
			})
			return
		}
		c.Next()
	}
}
