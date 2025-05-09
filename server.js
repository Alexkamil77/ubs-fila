const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Permitir de qualquer origem durante o desenvolvimento
        methods: ["GET", "POST"]
    }
});

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

let patientQueue = []; // Fila de pacientes na memória do servidor
let currentlyCallingPatient = null; // Paciente sendo chamado no momento
// Alterado para armazenar a URL COMPLETA da playlist ou null
let youtubePlaylistUrl = null;
let connectedProfessionals = {}; // Para rastrear profissionais conectados: { socketId: { name: 'Nome', role: 'Role' } }


io.on('connection', (socket) => {
    console.log('Novo cliente conectado:', socket.id);

    // --- Lógica de Conexão e Estado Inicial ---
    // Enviar o estado atual para o cliente que acabou de conectar
    socket.emit('current_state', {
        patients: patientQueue,
        calling: currentlyCallingPatient,
        // Envia a URL da playlist
        playlistUrl: youtubePlaylistUrl,
        professionals: Object.values(connectedProfessionals)
    });

    // --- Eventos do Profissional (Médico/Enfermeira) ---
    socket.on('professional_login', (professionalInfo) => {
         if (!professionalInfo || !professionalInfo.name || !professionalInfo.role) {
             socket.emit('error_message', 'Informações de login inválidas.');
             return;
         }
        connectedProfessionals[socket.id] = professionalInfo;
        console.log(`Profissional "${professionalInfo.name}" (${professionalInfo.role}) logado (ID: ${socket.id}).`);
        io.emit('professional_list_updated', Object.values(connectedProfessionals));
    });

    socket.on('professional_logout', () => {
        const professionalInfo = connectedProfessionals[socket.id];
        if (professionalInfo) {
            delete connectedProfessionals[socket.id];
            console.log(`Profissional "${professionalInfo.name}" (${professionalInfo.role}) deslogado (ID: ${socket.id}).`);
            io.emit('professional_list_updated', Object.values(connectedProfessionals));

            if (currentlyCallingPatient && currentlyCallingPatient.calledBySocketId === socket.id) {
                currentlyCallingPatient = null;
                io.emit('call_stopped');
                console.log(`Chamada parada pois o profissional "${professionalInfo.name}" deslogou.`);
            }
        }
    });

    socket.on('add_patient', (patientData) => {
        const professionalInfo = connectedProfessionals[socket.id];
        if (!professionalInfo) {
            socket.emit('error_message', 'Você precisa estar logado para adicionar pacientes.');
            return;
        }

        if (!patientData || !patientData.name) {
            socket.emit('error_message', 'Dados do paciente inválidos.');
            return;
        }

        const newPatient = {
            id: 'patient_' + Date.now(),
            name: patientData.name,
            priority: patientData.priority || 'normal',
            addedTime: Date.now(),
            addedBy: professionalInfo,
            addedBySocketId: socket.id
        };
        patientQueue.push(newPatient);
        sortPatientQueue();
        io.emit('queue_updated', patientQueue);
        console.log(`Paciente "${newPatient.name}" adicionado por "${professionalInfo.name}" (${professionalInfo.role}).`);
    });

    socket.on('call_patient', (patientId) => {
        const professionalInfo = connectedProfessionals[socket.id];
         if (!professionalInfo) {
            socket.emit('error_message', 'Você precisa estar logado para chamar pacientes.');
            return;
        }

        const patientIndex = patientQueue.findIndex(p => p.id === patientId);

        if (patientIndex !== -1 && !currentlyCallingPatient) {
            const patientToCall = patientQueue[patientIndex];

            if (patientToCall.addedBySocketId === socket.id) {
                patientQueue.splice(patientIndex, 1);

                currentlyCallingPatient = {
                    ...patientToCall,
                    calledBy: professionalInfo,
                    calledBySocketId: socket.id
                };

                io.emit('queue_updated', patientQueue);
                io.emit('patient_called', currentlyCallingPatient);
                console.log(`Paciente "${patientToCall.name}" chamado por "${professionalInfo.name}" (${professionalInfo.role}).`);
            } else {
                socket.emit('error_message', 'Você só pode chamar pacientes que você adicionou à fila.');
                 console.log(`Tentativa falha de chamar paciente "${patientToCall.name}" (profissional diferente).`);
            }
        } else if (currentlyCallingPatient) {
             socket.emit('error_message', `Já há um paciente sendo chamado: ${currentlyCallingPatient.name}.`);
              console.log(`Tentativa falha de chamar paciente (já chamando).`);
        } else {
            socket.emit('error_message', 'Paciente não encontrado na fila.');
            console.log(`Tentativa falha de chamar paciente (ID não encontrado: ${patientId}).`);
        }
    });

    socket.on('confirm_or_stop_call', (data) => {
         const professionalInfo = connectedProfessionals[socket.id];
         if (!professionalInfo) {
            socket.emit('error_message', 'Você precisa estar logado para encerrar chamadas.');
            return;
        }

        if (currentlyCallingPatient && currentlyCallingPatient.id === data.patientId) {
             if (currentlyCallingPatient.calledBySocketId === socket.id) {
                if (data.confirmed) {
                    console.log(`Chegada de "${currentlyCallingPatient.name}" confirmada por "${professionalInfo.name}".`);
                } else {
                    console.log(`Chamada de "${currentlyCallingPatient.name}" parada por "${professionalInfo.name}".`);
                }
                currentlyCallingPatient = null;
                io.emit('call_stopped');
                io.emit('queue_updated', patientQueue);
             } else {
                  socket.emit('error_message', 'Você só pode encerrar chamadas que você iniciou.');
                   console.log(`Tentativa falha de encerrar chamada (profissional diferente).`);
             }
        } else {
             socket.emit('error_message', 'Nenhum paciente ativo para encerrar a chamada.');
        }
    });

    // Evento para atualizar o vídeo - AGORA ESPERA A URL DA PLAYLIST
    socket.on('update_video', (url) => {
         const professionalInfo = connectedProfessionals[socket.id];
         if (!professionalInfo) {
            socket.emit('error_message', 'Você precisa estar logado para atualizar o vídeo.');
            return;
        }
        // Regex para validar URLs de playlist do YouTube
        const playlistRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/playlist\?list=|youtu\.be\/.*?[?&]list=)([a-zA-Z0-9_-]+)/;
        const match = url ? url.match(playlistRegex) : null;

        if (url && match) {
            const playlistId = match[1];
            // Armazena a URL de embed da playlist
            youtubePlaylistUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&mute=1&loop=1`; // URL de embed para playlist
            io.emit('video_updated', youtubePlaylistUrl); // Envia a URL de embed para a sala
            console.log(`Playlist do YouTube atualizada por "${professionalInfo.name}": ${youtubePlaylistUrl}`);
        } else if (!url) {
             youtubePlaylistUrl = null;
             io.emit('video_updated', youtubePlaylistUrl);
             console.log(`Vídeo/Playlist removido por "${professionalInfo.name}".`);
        }
        else {
             socket.emit('error_message', 'Link inválido. Use um link completo de uma playlist do YouTube.');
             console.log(`Tentativa falha de atualizar vídeo/playlist (link inválido) por "${professionalInfo.name}".`);
        }
    });

    // --- Lógica de Desconexão ---
    socket.on('disconnect', () => {
        const professionalInfo = connectedProfessionals[socket.id];
        if (professionalInfo) {
            delete connectedProfessionals[socket.id];
            console.log(`Profissional "${professionalInfo.name}" desconectado (ID: ${socket.id}).`);
            io.emit('professional_list_updated', Object.values(connectedProfessionals));

            if (currentlyCallingPatient && currentlyCallingPatient.calledBySocketId === socket.id) {
                currentlyCallingPatient = null;
                io.emit('call_stopped');
                 console.log(`Chamada parada pois o profissional "${professionalInfo.name}" desconectou inesperadamente.`);
            }
        } else {
             console.log('Cliente desconectado (sem login):', socket.id);
        }
    });
});

function sortPatientQueue() {
    patientQueue.sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (b.priority === 'high' && a.priority !== 'high') return 1;
        return a.addedTime - b.addedTime;
    });
}

app.get('/', (req, res) => {
  res.redirect('/medico.html');
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
