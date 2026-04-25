let socket;
let localStream;
let peerConnection;
let currentChannel = "";
const statusEl = document.getElementById('status');
const pttBtn = document.getElementById('ptt-btn');

// --- CONFIGURAZIONE ICE SERVERS (Dati Metered corretti) ---
const iceConfig = {
  iceServers: [
      { urls: "stun:stun.l.google.com:19302" }, // STUN di Google per sicurezza
      { urls: "stun:stun.relay.metered.ca:80" },
      {
        urls: "turn:global.relay.metered.ca:80",
        username: "038d70b4dbcba2d46bfb0cb8",
        credential: "iaqbMoOGxGFUmPJz",
      },
      {
        urls: "turn:global.relay.metered.ca:443",
        username: "038d70b4dbcba2d46bfb0cb8",
        credential: "iaqbMoOGxGFUmPJz",
      },
      {
        urls: "turns:global.relay.metered.ca:443?transport=tcp",
        username: "038d70b4dbcba2d46bfb0cb8",
        credential: "iaqbMoOGxGFUmPJz",
      }
  ]
};

socket = io("https://onair-server.onrender.com"); 

socket.on("connect", () => { 
    statusEl.innerText = "SISTEMA PRONTO (VoIP)"; 
    statusEl.style.color = "#0f0";
});

async function joinChannel() {
    currentChannel = document.getElementById('channel-input').value;
    if (!currentChannel) return alert("Inserisci un canale!");
    socket.emit("join-channel", currentChannel);
    document.getElementById('current-channel').innerText = currentChannel;
    pttBtn.disabled = false;
}

// LOGICA DI SEGNALAZIONE
socket.on("signal", async (data) => {
    if (!peerConnection) await startPeerConnection(false);

    if (data.offer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit("signal", { channel: currentChannel, answer });
    } else if (data.answer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.candidate) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) { console.error("Errore candidato ICE", e); }
    }
});

async function startPeerConnection(isCaller) {
    peerConnection = new RTCPeerConnection(iceConfig);

    // RICEZIONE AUDIO
    peerConnection.ontrack = (event) => {
        // Creiamo un elemento audio al volo se non esiste
        let remoteAudio = document.getElementById('remote-audio');
        if (!remoteAudio) {
            remoteAudio = document.createElement('audio');
            remoteAudio.id = 'remote-audio';
            remoteAudio.autoplay = true;
            document.body.appendChild(remoteAudio);
        }
        remoteAudio.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("signal", { channel: currentChannel, candidate: event.candidate });
        }
    };

    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }

    if (isCaller) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit("signal", { channel: currentChannel, offer });
    }
}

async function startTransmitting() {
    try {
        // Richiediamo il microfono prima di far partire la connessione
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true } 
        });
        await startPeerConnection(true);
        statusEl.innerText = ">>> TRASMISSIONE ATTIVA <<<";
        statusEl.style.color = "#ff0000";
    } catch (err) {
        alert("Errore microfono: " + err);
    }
}

function stopTransmitting() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    statusEl.innerText = "In ascolto su Canale " + currentChannel;
    statusEl.style.color = "#0f0";
}

pttBtn.onmousedown = pttBtn.ontouchstart = (e) => { 
    if (e.type === 'touchstart') e.preventDefault(); 
    startTransmitting(); 
};
pttBtn.onmouseup = pttBtn.ontouchend = stopTransmitting;
