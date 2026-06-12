package main

import "go.mongodb.org/mongo-driver/v2/bson"

type Persona struct {
	ID        bson.ObjectID `json:"id" bson:"_id,omitempty"`
	Nombre    string        `json:"nombre" bson:"nombre" binding:"required"`
	Apellidos string        `json:"apellidos" bson:"apellidos" binding:"required"`
	DNI       string        `json:"dni" bson:"dni" binding:"required"`
	Profesion string        `json:"profesion" bson:"profesion" binding:"required"`
	Email     string        `json:"email" bson:"email" binding:"required"`
	Telefono  string        `json:"telefono" bson:"telefono" binding:"required"`
}
