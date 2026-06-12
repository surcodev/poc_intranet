package main

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var col *mongo.Collection

func connectMongo() *mongo.Client {
	uri := getEnv("MONGODB_URI", "mongodb://localhost:27017")
	clientOpts := options.Client().
		ApplyURI(uri).
		SetMaxPoolSize(200).
		SetMinPoolSize(10).
		SetMaxConnIdleTime(5 * time.Minute)

	client, err := mongo.Connect(clientOpts)
	if err != nil {
		log.Fatal("Mongo connect error:", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err = client.Ping(ctx, nil); err != nil {
		log.Fatal("Mongo ping error:", err)
	}
	log.Println("MongoDB connected")
	return client
}

func initCollection(client *mongo.Client) {
	dbName := getEnv("MONGODB_DB", "intranet")
	col = client.Database(dbName).Collection("personas")

	_, err := col.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys:    bson.D{{Key: "dni", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		log.Fatal("Create index error:", err)
	}
	log.Println("Collection intranet.personas ready")
}
