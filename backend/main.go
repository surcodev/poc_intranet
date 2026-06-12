package main

import (
	"context"
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	client := connectMongo()
	defer client.Disconnect(context.Background())
	initCollection(client)

	go cleanupLimiters()

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type"},
		AllowCredentials: true,
	}))

	r.Use(rateLimitMiddleware())

	api := r.Group("/api")
	{
		api.POST("/personas", createPersona)
		api.GET("/personas", listPersonas)
	}

	log.Println("Server running on :9090")
	r.Run(":9090")
}
