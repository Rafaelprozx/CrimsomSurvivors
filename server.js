const http = require("http");
const WebSocket = require("ws");

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Servidor de lobby activo");
});

const wss = new WebSocket.Server({ noServer: true });

// Lista de hosts activos
// Cada host guarda: { id, name, players: [ {id, name, is_host, character_index, ws} ], max_players, ws }
let hosts = [];

function broadcastHosts() {
  const data = JSON.stringify({
    type: "hosts",
    list: hosts.map(h => ({
      id: h.id,
      name: h.name,
      players: h.players.length,
      max_players: h.max_players
    }))
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function broadcastPlayers(host) {
  const data = JSON.stringify({
    type: "update_players",
    host_id: host.id,
    players: host.players.map(p => ({
      id: p.id,
      name: p.name,
      is_host: p.is_host,
      character_index: p.character_index
    }))
  });

  host.players.forEach(p => {
    if (p.ws && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(data);
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
        hosts.push({
          id: data.id,
          name: data.name || "Partida",
          players: [
            { 
              id: data.host_id, 
              name: data.host_name || "Host", 
              is_host: true, 
              character_index: -1, // no seleccionado aún
              ws: ws 
            }
          ],
          max_players: data.max_players || 5,
          ws: ws
        });
        console.log("Nuevo host:", data.name);
        broadcastHosts();
        broadcastPlayers(hosts[hosts.length - 1]);
        break;

      case "get_hosts":
        ws.send(JSON.stringify({
          type: "hosts",
          list: hosts.map(h => ({
            id: h.id,
            name: h.name,
            players: h.players.length,
            max_players: h.max_players
          }))
        }));
        break;
		case "get_players":
		let host = hosts.find(h => h.id === data.host_id);
		if (host) {
			ws.send(JSON.stringify({
			 type: "update_players",
			 host_id: host.id,
			 players: host.players.map(p => ({
			id: p.id,
			name: p.name,
			is_host: p.is_host,
			character_index: p.character_index
      }))
    }));
  }
  break;

      case "join_host":
        {
          let host = hosts.find(h => h.id === data.host_id);
          if (host) {
            if (host.players.length < host.max_players) {
              host.players.push({
                id: data.player_id,
                name: data.name || "Jugador",
                is_host: false,
                character_index: -1,
                ws: ws
              });
              console.log(`Jugador ${data.name} se unió a ${host.name} (${host.players.length}/${host.max_players})`);
              broadcastHosts();
              broadcastPlayers(host);
            }
          }
        }
        break;

      case "select_character":
        {
          let host = hosts.find(h => h.id === data.host_id);
		  console.log(`host del id = ${h.id} host del data = ${data.host}`)
          if (host) {
            let player = host.players.find(p => p.id === data.player_id);
			console.log(`player id = ${p.id} data del player = ${player.id}`)
            if (player) {
              player.character_index = data.character_index;
              console.log(`${player.name} seleccionó personaje ${data.character_index}`);
              broadcastPlayers(host);
            }
          }
        }
        break;

      default:
        console.log("Mensaje desconocido:", data);
    }
  });

  ws.on("close", () => {
    console.log("Cliente desconectado");

    // Quitar al jugador desconectado de cualquier host
    hosts.forEach(host => {
      host.players = host.players.filter(p => p.ws !== ws);
    });

    // Quitar hosts cuyo host principal se desconectó
    hosts = hosts.filter(h => {
      const host_player = h.players.find(p => p.is_host);
      return host_player && host_player.ws.readyState === WebSocket.OPEN;
    });

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