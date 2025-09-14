// server.js
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

let clients = [];

wss.on("connection", (ws) => {
  console.log("Nuevo cliente conectado");

  clients.push(ws);

  ws.on("message", (message) => {
    console.log("Mensaje recibido:", message.toString());

    // Reenvía el mensaje a todos los demás clientes conectados
    for (let client of clients) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    }
  });

  ws.on("close", () => {
    console.log("Cliente desconectado");
    clients = clients.filter(c => c !== ws);
  });
});

console.log("Servidor de señalización corriendo 🚀");