// URL du serveur backend (sera mis à jour après déploiement sur Render)
const API_URL = 'https://hellomcdo-bot.onrender.com';

// Elements
const restaurantNum = document.getElementById('restaurant-num');
const dateStart = document.getElementById('date-start');
const dateEnd = document.getElementById('date-end');
const hourStart = document.getElementById('hour-start');
const hourEnd = document.getElementById('hour-end');
const orderMode = document.getElementById('order-mode');
const nbSurveys = document.getElementById('nb-surveys');
const comment = document.getElementById('comment');
const autoFillBtn = document.getElementById('auto-fill-btn');
const status = document.getElementById('status');
const statusText = document.getElementById('status-text');
const result = document.getElementById('result');
const resultTitle = document.getElementById('result-title');
const resultLogs = document.getElementById('result-logs');

// Set default dates
const today = new Date();
const threeDaysAgo = new Date(today);
threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
dateStart.value = threeDaysAgo.toISOString().split('T')[0];
dateEnd.value = today.toISOString().split('T')[0];

function getConfig() {
    return {
        restaurantNum: restaurantNum.value,
        dateStart: dateStart.value,
        dateEnd: dateEnd.value,
        hourStart: hourStart.value,
        hourEnd: hourEnd.value,
        orderMode: orderMode.value,
        comment: comment.value,
        count: parseInt(nbSurveys.value) || 1
    };
}

function showStatus(message) {
    status.classList.remove('hidden');
    result.classList.add('hidden');
    statusText.textContent = message;
}

function hideStatus() {
    status.classList.add('hidden');
}

function showResult(success, title, logs) {
    hideStatus();
    result.classList.remove('hidden', 'success', 'error');
    result.classList.add(success ? 'success' : 'error');
    resultTitle.textContent = title;
    resultLogs.innerHTML = logs.map(log => `<p>${log}</p>`).join('');
}

async function fillSurveys() {
    const config = getConfig();
    const count = config.count;

    autoFillBtn.disabled = true;
    autoFillBtn.textContent = 'En cours...';

    try {
        if (count === 1) {
            showStatus('Remplissage du questionnaire en cours...');

            const response = await fetch(`${API_URL}/fill`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            const data = await response.json();

            if (data.success) {
                showResult(true, 'Questionnaire rempli avec succes!', data.logs || []);
            } else {
                showResult(false, 'Erreur: ' + (data.error || 'Echec'), data.logs || []);
            }
        } else {
            showStatus(`Remplissage de ${count} questionnaires en cours...`);

            const response = await fetch(`${API_URL}/fill-multiple`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            const data = await response.json();

            const successCount = data.results?.filter(r => r.success).length || 0;
            const allLogs = data.results?.flatMap(r => [`--- Questionnaire ${r.index} ---`, ...(r.logs || [])]) || [];

            if (successCount === count) {
                showResult(true, `${count} questionnaires remplis avec succes!`, allLogs);
            } else if (successCount > 0) {
                showResult(true, `${successCount}/${count} questionnaires remplis`, allLogs);
            } else {
                showResult(false, 'Erreur lors du remplissage', allLogs);
            }
        }
    } catch (error) {
        showResult(false, 'Erreur de connexion au serveur', [
            'Le serveur est peut-etre en cours de demarrage.',
            'Reessaie dans quelques secondes.',
            'Erreur: ' + error.message
        ]);
    }

    autoFillBtn.disabled = false;
    autoFillBtn.textContent = 'Remplir le questionnaire automatiquement';
}

// Event listener
autoFillBtn.addEventListener('click', fillSurveys);
