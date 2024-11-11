package main

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var clients = make(map[*websocket.Conn]bool) // Connected clients
var broadcast = make(chan string)            // Broadcast channel

// Handle incoming WebSocket connections
func handleConnections(w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	// Upgrade initial GET request to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer conn.Close()

	clients[conn] = true

	for {
		// Read message from WebSocket
		messageType, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			delete(clients, conn)
			break
		}

		// Broadcast message to all clients
		for client := range clients {
			err := client.WriteMessage(messageType, msg)
			if err != nil {
				log.Println(err)
				client.Close()
				delete(clients, client)
			}
		}
	}
}

func main() {
	http.HandleFunc("/ws", handleConnections)

	go func() {
		for {
			msg := <-broadcast
			for client := range clients {
				err := client.WriteMessage(websocket.TextMessage, []byte(msg))
				if err != nil {
					log.Println(err)
					client.Close()
					delete(clients, client)
				}
			}
		}
	}()

	log.Println("Server started on :8283")
	err := http.ListenAndServe(":8283", nil)
	if err != nil {
		log.Fatal("Error starting server: ", err)
	}
}
