const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
// Configura o Socket.IO para permitir conexões de diferentes origens (importante para desenvolvimento local/testes se as portas forem diferentes)
// Em produção, é melhor configurar a origem específica do seu frontend.
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
let connectedDoctors = {}; // Para rastrear médicos conectados: { socketId: doctorName }

io.on('connection', (socket) => {
    console.log('Novo cliente conectado:', socket.id);

    // --- Lógica de Conexão e Estado Inicial ---
    // Enviar o estado atual para o cliente que acabou de conectar
    socket.emit('current_state', {
        patients: patientQueue,
        calling: currentlyCallingPatient,
        video: videoUrl,
        doctors: Object.values(connectedDoctors) // Envia a lista de nomes de médicos online
    });

    // --- Eventos do Médico ---
    socket.on('doctor_login', (doctorName) => {
        connectedDoctors[socket.id] = doctorName;
        console.log(`Médico "${doctorName}" logado (ID: ${socket.id}).`);
        // Opcional: notificar outros clientes que um médico logou/deslogou
        io.emit('doctor_list_updated', Object.values(connectedDoctors));
    });

    socket.on('doctor_logout', () => {
        const doctorName = connectedDoctors[socket.id];
        if (doctorName) {
            delete connectedDoctors[socket.id];
            console.log(`Médico "${doctorName}" deslogado (ID: ${socket.id}).`);
            io.emit('doctor_list_updated', Object.values(connectedDoctors));

            // Se o médico estava chamando alguém, parar a chamada
            if (currentlyCallingPatient && currentlyCallingPatient.calledBySocketId === socket.id) {
                currentlyCallingPatient = null;
                io.emit('call_stopped');
                console.log(`Chamada parada pois o médico "${doctorName}" deslogou.`);
            }
        }
    });

    socket.on('add_patient', (patientData) => {
        const doctorName = connectedDoctors[socket.id];
        if (!doctorName) {
            socket.emit('error_message', 'Você precisa estar logado como médico para adicionar pacientes.');
            return;
        }

        if (!patientData || !patientData.name) {
            socket.emit('error_message', 'Dados do paciente inválidos.');
            return;
        }

        const newPatient = {
            id: 'patient_' + Date.now(),
            name: patientData.name,
            priority: patientData.priority || 'normal', // Padrão para 'normal' se não especificado
            addedTime: Date.now(),
            addedByDoctor: doctorName, // Nome do médico que adicionou
            addedBySocketId: socket.id // ID do socket do médico que adicionou (útil para filtrar)
        };
        patientQueue.push(newPatient);
        sortPatientQueue(); // Ordena a fila
        io.emit('queue_updated', patientQueue); // Envia a fila atualizada para todos os clientes
        console.log(`Paciente "${newPatient.name}" adicionado por "${doctorName}".`);
    });

    socket.on('call_patient', (patientId) => {
        const doctorName = connectedDoctors[socket.id];
         if (!doctorName) {
            socket.emit('error_message', 'Você precisa estar logado como médico para chamar pacientes.');
            return;
        }

        // Encontra o paciente na fila
        const patientIndex = patientQueue.findIndex(p => p.id === patientId);

        if (patientIndex !== -1 && !currentlyCallingPatient) {
            const patientToCall = patientQueue[patientIndex];

            // Verifica se o médico que está tentando chamar é o mesmo que adicionou o paciente
            if (patientToCall.addedBySocketId === socket.id) {
                // Remove o paciente da fila principal
                patientQueue.splice(patientIndex, 1);

                // Define o paciente como sendo chamado
                currentlyCallingPatient = {
                    ...patientToCall,
                    calledByDoctor: doctorName, // Nome do médico que está chamando agora
                    calledBySocketId: socket.id // ID do socket do médico que está chamando agora
                };

                io.emit('queue_updated', patientQueue); // Envia a fila atualizada (sem o paciente chamado)
                io.emit('patient_called', currentlyCallingPatient); // Envia as informações do paciente chamado
                console.log(`Paciente "${patientToCall.name}" chamado por "${doctorName}".`);
            } else {
                socket.emit('error_message', 'Você só pode chamar pacientes que você adicionou à fila.');
                 console.log(`Tentativa falha de chamar paciente "${patientToCall.name}" (médico diferente).`);
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
         const doctorName = connectedDoctors[socket.id];
         if (!doctorName) {
            socket.emit('error_message', 'Você precisa estar logado como médico para encerrar chamadas.');
            return;
        }

        if (currentlyCallingPatient && currentlyCallingPatient.id === data.patientId) {
             // Verifica se o médico que está tentando encerrar a chamada é o mesmo que a iniciou
             if (currentlyCallingPatient.calledBySocketId === socket.id) {
                if (data.confirmed) {
                    console.log(`Chegada de "${currentlyCallingPatient.name}" confirmada por "${doctorName}".`);
                    // O paciente é removido da fila ao ser chamado, então não precisa remover aqui.
                } else {
                    console.log(`Chamada de "${currentlyCallingPatient.name}" parada por "${doctorName}".`);
                    // Opcional: recolocar o paciente na fila se a chamada for parada sem confirmação
                    // patientQueue.push(currentlyCallingPatient);
                    // sortPatientQueue();
                    // io.emit('queue_updated', patientQueue); // Envia a fila atualizada se recolocou
                }
                currentlyCallingPatient = null;
                io.emit('call_stopped'); // Notifica a sala de espera e outros médicos
                io.emit('queue_updated', patientQueue); // Garante que a fila na sala de espera e médicos esteja atualizada

             } else {
                  socket.emit('error_message', 'Você só pode encerrar chamadas que você iniciou.');
                   console.log(`Tentativa falha de encerrar chamada (médico diferente).`);
             }
        } else {
             socket.emit('error_message', 'Nenhum paciente ativo para encerrar a chamada.');
        }
    });

    socket.on('update_video', (url) => {
         const doctorName = connectedDoctors[socket.id];
         if (!doctorName) {
            socket.emit('error_message', 'Você precisa estar logado como médico para atualizar o vídeo.');
            return;
        }
        // Basic validation for YouTube URL (can be more robust)
        const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url ? url.match(youtubeRegex) : null;

        if (url && match) {
            const videoId = match[1];
            videoUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`;
            io.emit('video_updated', videoUrl);
            console.log(`Vídeo do YouTube atualizado por "${doctorName}": ${videoUrl}`);
        } else if (!url) {
             videoUrl = null;
             io.emit('video_updated', videoUrl);
             console.log(`Vídeo removido por "${doctorName}".`);
        }
        else {
             socket.emit('error_message', 'Link do YouTube inválido.');
             console.log(`Tentativa falha de atualizar vídeo (link inválido) por "${doctorName}".`);
        }
    });

    // --- Lógica de Desconexão ---
    socket.on('disconnect', () => {
        const doctorName = connectedDoctors[socket.id];
        if (doctorName) {
            delete connectedDoctors[socket.id];
            console.log(`Médico "${doctorName}" desconectado (ID: ${socket.id}).`);
            io.emit('doctor_list_updated', Object.values(connectedDoctors));

             // Se o médico que desconectou estava chamando alguém, parar a chamada
            if (currentlyCallingPatient && currentlyCallingPatient.calledBySocketId === socket.id) {
                currentlyCallingPatient = null;
                io.emit('call_stopped');
                 console.log(`Chamada parada pois o médico "${doctorName}" desconectou inesperadamente.`);
            }
        } else {
             console.log('Cliente desconectado (sem login de médico):', socket.id);
              // Se o cliente desconectado era a sala de espera e havia um paciente sendo chamado por ele (menos provável), parar a chamada.
              // Isso dependeria de como você identifica a sala de espera.
        }
    });
});

// Função para ordenar a fila (alta prioridade primeiro, depois por tempo de adição)
function sortPatientQueue() {
    patientQueue.sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (b.priority === 'high' && a.priority !== 'high') return 1;
        return a.addedTime - b.addedTime;
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});