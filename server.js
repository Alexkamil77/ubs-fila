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
let videoUrl = null; // URL do vídeo para a sala de espera
// Alterado para armazenar objetos { name: 'Nome', role: 'Doutor/Enfermeira' }
let connectedProfessionals = {}; // Para rastrear profissionais conectados: { socketId: { name: 'Nome', role: 'Role' } }


io.on('connection', (socket) => {
    console.log('Novo cliente conectado:', socket.id);

    // --- Lógica de Conexão e Estado Inicial ---
    // Enviar o estado atual para o cliente que acabou de conectar
    socket.emit('current_state', {
        patients: patientQueue,
        calling: currentlyCallingPatient,
        video: videoUrl,
        // Envia a lista de profissionais online (nome e role)
        professionals: Object.values(connectedProfessionals)
    });

    // --- Eventos do Profissional (Médico/Enfermeira) ---
    // Evento quando um profissional loga - AGORA RECEBE NOME E ROLE
    socket.on('professional_login', (professionalInfo) => {
         if (!professionalInfo || !professionalInfo.name || !professionalInfo.role) {
             socket.emit('error_message', 'Informações de login inválidas.');
             return;
         }
        connectedProfessionals[socket.id] = professionalInfo; // Armazena o objeto {name, role}
        console.log(`Profissional "${professionalInfo.name}" (${professionalInfo.role}) logado (ID: ${socket.id}).`);
        // Notifica outros clientes que a lista de profissionais online atualizou
        io.emit('professional_list_updated', Object.values(connectedProfessionals));
    });

    // Evento quando um profissional desloga
    socket.on('professional_logout', () => {
        const professionalInfo = connectedProfessionals[socket.id];
        if (professionalInfo) {
            delete connectedProfessionals[socket.id];
            console.log(`Profissional "${professionalInfo.name}" (${professionalInfo.role}) deslogado (ID: ${socket.id}).`);
            io.emit('professional_list_updated', Object.values(connectedProfessionals));

            // Se o profissional estava chamando alguém, parar a chamada
            if (currentlyCallingPatient && currentlyCallingPatient.calledBySocketId === socket.id) {
                currentlyCallingPatient = null;
                io.emit('call_stopped');
                console.log(`Chamada parada pois o profissional "${professionalInfo.name}" deslogou.`);
            }
        }
    });

    // Evento para adicionar paciente
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
            addedBy: professionalInfo, // Armazena o objeto {name, role} de quem adicionou
            addedBySocketId: socket.id
        };
        patientQueue.push(newPatient);
        sortPatientQueue(); // Ordena a fila
        io.emit('queue_updated', patientQueue); // Envia a fila atualizada para todos os clientes
        console.log(`Paciente "${newPatient.name}" adicionado por "${professionalInfo.name}" (${professionalInfo.role}).`);
    });

    // Evento para chamar paciente
    socket.on('call_patient', (patientId) => {
        const professionalInfo = connectedProfessionals[socket.id];
         if (!professionalInfo) {
            socket.emit('error_message', 'Você precisa estar logado para chamar pacientes.');
            return;
        }

        const patientIndex = patientQueue.findIndex(p => p.id === patientId);

        if (patientIndex !== -1 && !currentlyCallingPatient) {
            const patientToCall = patientQueue[patientIndex];

            // Verifica se o profissional que está tentando chamar é o mesmo que adicionou o paciente
            if (patientToCall.addedBySocketId === socket.id) {
                patientQueue.splice(patientIndex, 1);

                currentlyCallingPatient = {
                    ...patientToCall,
                    calledBy: professionalInfo, // Armazena o objeto {name, role} de quem chamou
                    calledBySocketId: socket.id
                };

                io.emit('queue_updated', patientQueue);
                io.emit('patient_called', currentlyCallingPatient); // Inclui o objeto 'calledBy'
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

    // Evento para confirmar chegada ou parar chamada
    socket.on('confirm_or_stop_call', (data) => {
         const professionalInfo = connectedProfessionals[socket.id];
         if (!professionalInfo) {
            socket.emit('error_message', 'Você precisa estar logado para encerrar chamadas.');
            return;
        }

        if (currentlyCallingPatient && currentlyCallingPatient.id === data.patientId) {
             // Verifica se o profissional que está tentando encerrar a chamada é o mesmo que a iniciou
             if (currentlyCallingPatient.calledBySocketId === socket.id) {
                if (data.confirmed) {
                    console.log(`Chegada de "${currentlyCallingPatient.name}" confirmada por "${professionalInfo.name}".`);
                } else {
                    console.log(`Chamada de "${currentlyCallingPatient.name}" parada por "${professionalInfo.name}".`);
                    // Opcional: recolocar o paciente na fila
                }
                currentlyCallingPatient = null;
                io.emit('call_stopped');
                io.emit('queue_updated', patientQueue); // Garante que a fila esteja atualizada em todos
             } else {
                  socket.emit('error_message', 'Você só pode encerrar chamadas que você iniciou.');
                   console.log(`Tentativa falha de encerrar chamada (profissional diferente).`);
             }
        } else {
             socket.emit('error_message', 'Nenhum paciente ativo para encerrar a chamada.');
        }
    });

    // Evento para atualizar o vídeo
    socket.on('update_video', (url) => {
         const professionalInfo = connectedProfessionals[socket.id];
         if (!professionalInfo) {
            socket.emit('error_message', 'Você precisa estar logado para atualizar o vídeo.');
            return;
        }
        const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url ? url.match(youtubeRegex) : null;

        if (url && match) {
            const videoId = match[1];
            // Nota: Usando googleusercontent.com/youtube.com é um padrão incomum,
            // um embed URL padrão do YouTube seria mais robusto:
            videoUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`;
             io.emit('video_updated', videoUrl);
            console.log(`Vídeo do YouTube atualizado por "${professionalInfo.name}": ${videoUrl}`);
        } else if (!url) {
             videoUrl = null;
             io.emit('video_updated', videoUrl);
             console.log(`Vídeo removido por "${professionalInfo.name}".`);
        }
        else {
             socket.emit('error_message', 'Link do YouTube inválido.');
             console.log(`Tentativa falha de atualizar vídeo (link inválido) por "${professionalInfo.name}".`);
        }
    });

    // --- Lógica de Desconexão ---
    socket.on('disconnect', () => {
        const professionalInfo = connectedProfessionals[socket.id];
        if (professionalInfo) {
            delete connectedProfessionals[socket.id];
            console.log(`Profissional "${professionalInfo.name}" desconectado (ID: ${socket.id}).`);
            io.emit('professional_list_updated', Object.values(connectedProfessionals));

             // Se o profissional que desconectou estava chamando alguém, parar a chamada
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

// Rota para redirecionar a raiz para o painel do médico (opcional)
app.get('/', (req, res) => {
  res.redirect('/medico.html');
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
