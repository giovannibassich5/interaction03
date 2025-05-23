const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
console.log('✅ Server WebSocket in ascolto su ws://localhost:8080');

let lastGesture = null;
const HANDSHAKE_WINDOW_MS = 3000;

wss.on('connection', function connection(ws) {
  console.log('🔗 Nuovo client connesso');

  ws.on('message', function incoming(message) {
    if (Buffer.isBuffer(message)) {
      message = message.toString('utf8');
    }

    console.log('Messaggio ricevuto dal client:', message);

    try {
      const data = JSON.parse(message);

      if (
        data.type === 'gesture-data' &&
        data.features &&
        Array.isArray(data.features)
      ) {
        const label = data.label || null;
        const confidence = parseFloat(data.confidence || 0);
        const now = Date.now();

        if ((label !== 'HS' && label !== 'handshake') || confidence < 0.9) {
          console.log(`⚠️ Gesto ignorato: ${label} (conf: ${confidence})`);
          return;
        }

        if (
          lastGesture &&
          now - lastGesture.timestamp < HANDSHAKE_WINDOW_MS &&
          lastGesture.ws !== ws
        ) {
          ws.send('handshake-success');
          lastGesture.ws.send('handshake-success');
          console.log(`🤝 Handshake riuscito tra due client`);
          lastGesture = null;
        } else {
          lastGesture = { timestamp: now, ws };

          setTimeout(() => {
            if (lastGesture && lastGesture.ws === ws) {
              ws.send('handshake-failed');
              console.log('❌ Handshake fallito');
              lastGesture = null;
            }
          }, HANDSHAKE_WINDOW_MS);
        }
      } else {
        console.log('⚠️ Messaggio gesture-data senza features riconosciute');
      }
    } catch (err) {
      console.error('❗ Errore parsing messaggio:', err);
    }
  });

  ws.on('close', () => {
    if (lastGesture && lastGesture.ws === ws) {
      lastGesture = null;
    }
    console.log('🔌 Client disconnesso');
  });
});
