<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sala de Espera - UBS SESC</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Poppins', sans-serif; background-color: #f0f8ff; }
        .patient-called-high-priority { color: #ef4444; /* Vermelho */ }
        .blinking-text { animation: blinker 1.5s linear infinite; }
        @keyframes blinker { 50% { opacity: 0.4; } }
        .video-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; background-color: #000; }
        /* O iframe agora será criado dinamicamente pela API do YouTube dentro desta div */
        #youtube-player { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }

        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #e0e7ff; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #a5b4fc; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #818cf8; }

        /* Ajuste para aumentar a área da seção de chamada */
        #patientCalledSection {
            padding-top: 1.5rem;
            padding-bottom: 1.5rem;
            min-height: 150px;
        }
    </style>
</head>
<body class="min-h-screen flex flex-col">
    <div class="container mx-auto p-4 md:p-8 flex-grow">
        <header class="bg-white p-6 rounded-xl shadow-lg mb-8 border-t-4 border-blue-500">
            <div id="patientCalledSection" class="text-center flex flex-col justify-center">
                <p class="text-2xl md:text-3xl text-gray-500">Aguardando chamada...</p>
                </div>
            <div class="mt-4 flex flex-col md:flex-row justify-between items-center text-center md:text-left border-t pt-4">
                <div>
                    <p class="text-xl font-semibold text-blue-700">UBS SESC</p>
                    <p class="text-md text-blue-600">Equipe: Cristina C. / Dr. Alexander Jimenez Ocana</p>
                    <p id="professionalsOnlineDisplay" class="text-md text-blue-600">Profissionais Online: <span class="font-medium">Aguardando...</span></p>
                </div>
                <div class="mt-4 md:mt-0 text-right">
                    <p id="currentDate" class="text-lg text-gray-700"></p>
                    <p id="currentTime" class="text-3xl font-bold text-blue-800"></p>
                </div>
            </div>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div class="md:col-span-1 bg-indigo-50 p-6 rounded-xl shadow-lg">
                <h2 class="text-2xl font-semibold text-indigo-700 mb-4 text-center">Próximos Pacientes</h2>
                <div id="waitingListDisplay" class="space-y-3 max-h-96 overflow-y-auto custom-scrollbar bg-white p-4 rounded-lg shadow-inner">
                    <p class="text-gray-500 text-center py-4">Nenhum paciente aguardando na fila.</p>
                </div>
            </div>

            <div class="md:col-span-2 bg-black p-1 rounded-xl shadow-lg flex flex-col">
                 <h2 class="text-2xl font-semibold text-white mb-3 text-center pt-3">Entretenimento</h2>
                <div id="videoPlayerContainer" class="video-container rounded-md flex-grow">
                    <div id="youtube-player"></div>
                    <p id="noPlaylistMessage" class="flex items-center justify-center h-full text-white text-lg" style="display: none;">Nenhuma playlist selecionada.</p>
                </div>
            </div>
        </div>
    </div>

    <footer class="text-center py-4 bg-blue-700 text-white">
        <p>© <span id="currentYear"></span> UBS SESC Atendimento. Tenha um ótimo dia!</p>
    </footer>

    <script src="https://www.youtube.com/iframe_api"></script>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();

        const synth = window.speechSynthesis;
        let voices = [];
        let callIntervalId = null;
        let lastCalledPatientInfo = null;

        // Variáveis para o Player do YouTube
        let player; // Objeto do player do YouTube
        let normalVolume = 40; // Volume normal do vídeo (0-100)
        let reducedVolume = 10; // Volume reduzido durante a chamada (0-100)
        let currentPlaylistEmbedUrl = null; // Armazena a URL DE EMBED da playlist atual

        const patientCalledSection = document.getElementById('patientCalledSection');
        const professionalsOnlineDisplayEl = document.getElementById('professionalsOnlineDisplay').querySelector('span');
        const waitingListDisplay = document.getElementById('waitingListDisplay');
        const videoPlayerContainer = document.getElementById('videoPlayerContainer');
        const currentDateEl = document.getElementById('currentDate');
        const currentTimeEl = document.getElementById('currentTime');
        const noPlaylistMessageEl = document.getElementById('noPlaylistMessage');
        document.getElementById('currentYear').textContent = new Date().getFullYear();

         // --- Lógica de Conexão e Eventos do Socket ---
        socket.on('connect', () => {
            console.log('Sala de espera conectada ao servidor Socket.IO');
        });

        socket.on('disconnect', () => {
            console.log('Sala de espera desconectada do servidor Socket.IO');
             clearCalledPatient();
             updateWaitingList([]);
             updateVideoPlayer(null);
             updateProfessionalDisplay([]);
        });

        socket.on('current_state', (state) => {
            console.log('Estado inicial recebido:', state);
            updateWaitingList(state.patients);
            if (state.calling) {
                displayCalledPatient(state.calling, state.calling.calledBy);
            } else {
                clearCalledPatient();
            }
             // Usa state.playlistEmbedUrl para atualizar o player
            updateVideoPlayer(state.playlistEmbedUrl);
             updateProfessionalDisplay(state.professionals);
        });


        socket.on('queue_updated', (updatedQueue) => {
            console.log('Fila atualizada recebida:', updatedQueue);
            updateWaitingList(updatedQueue);
        });

        socket.on('patient_called', (calledPatientInfo) => {
            console.log('Paciente sendo chamado:', calledPatientInfo);
            displayCalledPatient(calledPatientInfo, calledPatientInfo.calledBy);
            // Reduz o volume do vídeo ao iniciar a chamada
            if (player && typeof player.setVolume === 'function') { // Verifica se o player existe e o método setVolume está disponível
                player.setVolume(reducedVolume);
                 console.log("Volume do vídeo reduzido.");
            } else {
                 console.warn("Player do YouTube não pronto ou setVolume não disponível para reduzir volume.");
            }
        });

        socket.on('call_stopped', () => {
            console.log('Chamada parada.');
            clearCalledPatient();
            // Restaura o volume do vídeo ao parar a chamada
            if (player && typeof player.setVolume === 'function') { // Verifica se o player existe e o método setVolume está disponível
                player.setVolume(normalVolume);
                 console.log("Volume do vídeo restaurado.");
            } else {
                 console.warn("Player do YouTube não pronto ou setVolume não disponível para restaurar volume.");
            }
        });

        // Recebe a URL de embed da playlist do servidor
        socket.on('video_updated', (playlistEmbedUrl) => {
            console.log('Playlist atualizada recebida:', playlistEmbedUrl);
            updateVideoPlayer(playlistEmbedUrl);
        });

         socket.on('professional_list_updated', (professionalList) => {
             console.log('Lista de profissionais online atualizada:', professionalList);
             const professionalNamesAndRoles = professionalList.map(p => `${p.name} (${p.role})`);
             updateProfessionalDisplay(professionalNamesAndRoles);
         });

        // --- Funções da API do Player do YouTube ---

        // Esta função é chamada automaticamente quando a API do YouTube estiver pronta (Nome PADRÃO da função)
        function onYouTubeIframeAPIReady() {
            console.log("API do YouTube IFrame Player Ready (Função Padrão).");
             // Cria o player assim que a API estiver pronta, usando a URL de embed armazenada
             if (currentPlaylistEmbedUrl) {
                 createPlayer(currentPlaylistEmbedUrl);
             } else {
                 // Garante que a mensagem "Nenhuma playlist selecionada" esteja visível se não houver playlist
                 updateVideoPlayer(null); // Isso irá ocultar o player e mostrar a mensagem
             }
        }

        // Cria ou atualiza o player do YouTube
        function createPlayer(playlistEmbedUrl) {
             // Verifica se a URL de embed é válida e extrai o ID da playlist (redundante se o backend já validar, mas seguro)
             const playlistIdMatch = playlistEmbedUrl ? playlistEmbedUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/) : null;
             const playlistId = playlistIdMatch ? playlistIdMatch[1] : null;

             if (!playlistId) {
                 console.error("ID da playlist não encontrado na URL de embed:", playlistEmbedUrl);
                 updateVideoPlayer(null);
                 return;
             }

            // Se já existe um player, destrua-o primeiro para evitar múltiplos players
            if (player && typeof player.destroy === 'function') {
                player.destroy();
                console.log("Player do YouTube existente destruído.");
            }

            // Oculta a mensagem padrão
            if (noPlaylistMessageEl) noPlaylistMessageEl.style.display = 'none';

            // Cria um novo player
            player = new YT.Player('youtube-player', {
                // A altura e largura serão controladas pelo CSS do contêiner #youtube-player
                // height: '100%',
                // width: '100%',
                playerVars: {
                    'listType': 'playlist',
                    'list': playlistId, // Define o ID da playlist
                    'autoplay': 1, // Autoplay (pode depender das políticas do navegador)
                    'mute': 1, // Mudo inicialmente para aumentar a chance de autoplay funcionar
                    'loop': 1, // Repetir a playlist
                    'controls': 1, // Mostrar controles
                    'showinfo': 0, // Não mostrar título do vídeo
                    'rel': 0, // Não mostrar vídeos relacionados ao final
                    'enablejsapi': 1, // Habilitar a API JavaScript (essencial)
                    'origin': window.location.origin // Importante para a API em alguns casos
                },
                events: {
                    'onReady': onPlayerReady,
                    'onError': onPlayerError
                    // Outros eventos: onStateChange, onPlaybackQualityChange, onPlaybackRateChange, onApiChange
                     // onStateChange é útil para detectar quando o player começa/para de tocar, etc.
                }
            });
            console.log("Player do YouTube criado para playlist com ID:", playlistId);
        }

        // Chamada quando o player estiver pronto e a API puder ser usada
        function onPlayerReady(event) {
            console.log("Player do YouTube pronto.");
             // Defina o volume inicial após o player estar pronto
            if (player && typeof player.setVolume === 'function') {
                 player.setVolume(normalVolume);
                 console.log("Volume inicial do vídeo definido para:", normalVolume);
                 // Opcional: Remover o mudo após a interação do usuário (não implementado aqui)
                 // player.unMute();
            }
             // O player pode estar pausado inicialmente dependendo das políticas de autoplay do navegador.
             // event.target.playVideo(); // Tentar iniciar a reprodução
        }

        // Chamada se ocorrer um erro no player
        function onPlayerError(event) {
            console.error("Erro no Player do YouTube:", event.data);
             // Mostra a mensagem de "Nenhuma playlist selecionada" em caso de erro
             updateVideoPlayer(null); // Isso destrói o player e mostra a mensagem

             let errorMessage = "Ocorreu um erro ao carregar o vídeo/playlist.";
              if (event.data === 2) errorMessage = "ID do vídeo/playlist inválido.";
             else if (event.data === 100) errorMessage = "Vídeo não encontrado.";
             else if (event.data === 101 || event.data === 150) errorMessage = "Vídeo não pode ser reproduzido neste player (privado ou restrito).";
              else if (event.data === 5) errorMessage = "Erro de reprodução (Flash player não habilitado ou outro).";

             console.error("Mensagem de erro do player:", errorMessage);
             // Opcional: Exibir a mensagem de erro na tela para o usuário
        }


        // Esta função agora gerencia a criação/remoção do player e a exibição da mensagem
        function updateVideoPlayer(playlistEmbedUrl) {
             currentPlaylistEmbedUrl = playlistEmbedUrl; // Armazena a URL de embed recebida

            if (playlistEmbedUrl) {
                 // Se a API do YouTube já estiver pronta, cria o player
                 if (window.YT && window.YT.Player) {
                    createPlayer(playlistEmbedUrl);
                 } else {
                    // Se a API ainda não estiver pronta, ela será carregada (pela tag script)
                    // e chamará onYouTubeIframeAPIReady, que verificará currentPlaylistEmbedUrl
                    // e criará o player.
                    console.log("API do YouTube ainda não pronta. Player será criado quando onYouTubeIframeAPIReady for chamada.");
                 }
                 // Oculta a mensagem padrão assim que uma URL é recebida
                if (noPlaylistMessageEl) noPlaylistMessageEl.style.display = 'none';
            } else {
                 // Se a URL for nula ou vazia, destrói o player existente (se houver)
                if (player && typeof player.destroy === 'function') {
                    player.destroy();
                    player = null; // Limpa a referência
                    console.log("Player do YouTube destruído (playlist removida).");
                }
                 // Mostra a mensagem padrão
                if (noPlaylistMessageEl) noPlaylistMessageEl.style.display = 'flex';
            }
        }


        // --- Funções de UI e Exibição (mantidas) ---

        function loadVoices() {
             // Busca por vozes em português, priorizando nomes que indicam "feminina" ou "Brazil"
            voices = synth.getVoices().filter(voice =>
                voice.lang.startsWith('pt') &&
                (voice.name.toLowerCase().includes('female') ||
                 voice.name.toLowerCase().includes('feminina') ||
                 voice.name.toLowerCase().includes('brazil'))
            );

             if (voices.length === 0) {
                 voices = synth.getVoices().filter(voice => voice.lang.startsWith('pt'));
             }

             if (voices.length === 0 && synth.getVoices().length > 0) {
                 voices = [synth.getVoices()[0]];
             }

            if (voices.length === 0 && speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = () => {
                    loadVoices();
                    console.log("Vozes carregadas após evento onvoiceschanged.");
                };
            } else if (voices.length > 0) {
                 console.log("Vozes carregadas. Voz(es) selecionada(s):", voices.map(v => `${v.name} (${v.lang})`).join(', '));
            } else {
                 console.warn("Nenhuma voz de síntese de fala encontrada.");
            }
        }
        // Garante que a função loadVoices seja chamada APÓS o DOM estar completamente carregado
        document.addEventListener('DOMContentLoaded', loadVoices);


        function updateDateTime() {
            const now = new Date();
            currentDateEl.textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            currentTimeEl.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        setInterval(updateDateTime, 1000);
        updateDateTime();

        function displayCalledPatient(patientInfo, callingProfessionalInfo) {
            lastCalledPatientInfo = patientInfo;

             let title = callingProfessionalInfo && callingProfessionalInfo.role === 'Enfermeira' ? 'Enfermeira(o)' : 'Doutor(a)';
             let pronoun = callingProfessionalInfo && callingProfessionalInfo.role === 'Enfermeira' ? 'à' : 'ao';
             let roomText = callingProfessionalInfo && callingProfessionalInfo.role === 'Enfermeira' ? 'sala' : 'consultório';

            patientCalledSection.innerHTML = `
                <p class="text-4xl md:text-5xl font-bold ${patientInfo.priority === 'high' ? 'patient-called-high-priority' : 'text-green-600'}">
                    ${patientInfo.name}
                </p>
                ${patientInfo.priority === 'high' ? '<p class="text-2xl text-red-500 font-semibold mt-1">ATENDIMENTO PRIORITÁRIO</p>' : ''}
                <p class="text-xl md:text-2xl text-gray-700 mt-2">Por favor, dirija-se ${pronoun} ${roomText}:</p>
                <p class="text-2xl md:text-3xl font-semibold text-blue-700">${title} ${callingProfessionalInfo ? callingProfessionalInfo.name : 'Responsável'}</p>
            `;

            const announcement = `${patientInfo.name}, ${patientInfo.priority === 'high' ? 'atendimento prioritário,' : ''} por favor, dirija-se ${pronoun} ${roomText} da ${title} ${callingProfessionalInfo ? callingProfessionalInfo.name : 'responsável'}.`;

            speak(announcement);

            if (callIntervalId) clearInterval(callIntervalId);
            callIntervalId = setInterval(() => {
                if (lastCalledPatientInfo) {
                     const currentTitle = lastCalledPatientInfo.calledBy && lastCalledPatientInfo.calledBy.role === 'Enfermeira' ? 'Enfermeira(o)' : 'Doutor(a)';
                     const currentPronoun = lastCalledPatientInfo.calledBy && lastCalledPatientInfo.calledBy.role === 'Enfermeira' ? 'à' : 'ao';
                     const currentRoomText = lastCalledPatientInfo.calledBy && lastCalledPatientInfo.calledBy.role === 'Enfermeira' ? 'sala' : 'consultório';

                     const repeatAnnouncement = `${lastCalledPatientInfo.name}, ${lastCalledPatientInfo.priority === 'high' ? 'atendimento prioritário,' : ''} por favor, dirija-se ${currentPronoun} ${currentRoomText} da ${currentTitle} ${lastCalledPatientInfo.calledBy ? lastCalledPatientInfo.calledBy.name : 'responsável'}.`;
                     speak(repeatAnnouncement);
                } else {
                    clearInterval(callIntervalId);
                    callIntervalId = null;
                }
            }, 30000);
        }

        function clearCalledPatient() {
            lastCalledPatientInfo = null;
            if (callIntervalId) clearInterval(callIntervalId);
            callIntervalId = null;
            patientCalledSection.innerHTML = '<p class="text-2xl md:text-3xl text-gray-500">Aguardando chamada...</p>';
            patientCalledSection.classList.remove('blinking-text');
             if (synth.speaking) {
                synth.cancel();
            }
        }

        function updateWaitingList(patients) {
            waitingListDisplay.innerHTML = '';
            const patientsToShow = patients.filter(p => !lastCalledPatientInfo || p.id !== lastCalledPatientInfo.id);

            if (patientsToShow.length === 0) {
                waitingListDisplay.innerHTML = '<p class="text-gray-500 text-center py-4">Nenhum paciente aguardando na fila.</p>';
                return;
            }
            patientsToShow.slice(0, 10).forEach((patient, index) => {
                const div = document.createElement('div');
                div.className = `p-3 rounded-md shadow-sm text-center ${patient.priority === 'high' ? 'bg-red-100 border-l-4 border-red-500' : 'bg-green-100 border-l-4 border-green-500'}`;
                div.innerHTML = `
                    <p class="font-semibold text-gray-800 text-lg">${index + 1}. ${patient.name}</p>
                    <p class="text-sm text-gray-600 italic">Adicionado por: ${patient.addedBy ? patient.addedBy.name + ' (' + patient.addedBy.role + ')' : 'N/A'}</p>
                    ${patient.priority === 'high' ? '<p class="text-sm text-red-700 font-medium">PRIORIDADE</p>' : '<p class="text-sm text-green-700">Normal</p>'}
                `;
                waitingListDisplay.appendChild(div);
            });
        }

        function updateProfessionalDisplay(professionalNamesAndRoles) {
            if (professionalNamesAndRoles && professionalNamesAndRoles.length > 0) {
                 professionalsOnlineDisplayEl.textContent = professionalNamesAndRoles.join(', ');
            } else {
                 professionalsOnlineDisplayEl.textContent = 'Nenhum profissional online.';
            }
        }
    </script>
</body>
</html>
