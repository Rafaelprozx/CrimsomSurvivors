// server.js
const http = require("http");
const WebSocket = require("ws");

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Servidor activo");
});

const wss = new WebSocket.Server({ noServer: true });

wss.on("connection", ws => {
  console.log("Cliente conectado");
  ws.on("message", msg => {
    ws.send(msg); // eco para prueba
  });
});

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit("connection", ws, request);
  });
});

server.listen(process.env.PORT || 8080, () => {
  console.log("Servidor corriendo en puerto", process.env.PORT || 8080);
});

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