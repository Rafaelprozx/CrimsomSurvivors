const http = require("http");
const WebSocket = require("ws");

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Servidor de lobby activo");
});

const wss = new WebSocket.Server({ noServer: true });

// Lista de hosts activos
let hosts = []; // [{ id, name, players, max_players, ws }]

function broadcastHosts() {
  const data = JSON.stringify({
    type: "hosts",
    list: hosts.map(h => ({
      id: h.id,
      name: h.name,
      players: h.players,
      max_players: h.max_players
    }))
  });

  // Enviar la lista a todos los clientes
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

wss.on("connection", (ws) => {
  console.log("Cliente conectado");

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      console.error("Error parseando mensaje:", msg);
      return;
    }

    switch (data.type) {
      case "new_host":
        // Registrar un nuevo host
        hosts.push({
          id: data.id,
          name: data.name || "Partida",
          players: 1,
          max_players: data.max_players || 5,
          ws: ws
        });
        console.log("Nuevo host:", data.name);
        broadcastHosts();
        break;

      case "get_hosts":
        // Responder solo al cliente que lo pidió
        ws.send(JSON.stringify({
          type: "hosts",
          list: hosts.map(h => ({
            id: h.id,
            name: h.name,
            players: h.players,
            max_players: h.max_players
          }))
        }));
        break;

      case "join_host":
        // Buscar el host por ID
        let host = hosts.find(h => h.id === data.host_id);
        if (host) {
          host.players = Math.min(host.players + 1, host.max_players);
          console.log(`Jugador se unió a ${host.name} (${host.players}/${host.max_players})`);
          broadcastHosts();
        }
        break;

      default:
        console.log("Mensaje desconocido:", data);
    }
  });

  ws.on("close", () => {
    console.log("Cliente desconectado");

    // Limpiar hosts que pertenecían a este cliente
    hosts = hosts.filter(h => h.ws !== ws);
    broadcastHosts();
  });
});

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

server.listen(process.env.PORT || 8080, () => {
  console.log("Servidor corriendo en puerto", process.env.PORT || 8080);
});