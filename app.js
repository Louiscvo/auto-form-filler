// Elements
const restaurantNum = document.getElementById('restaurant-num');
const dateStart = document.getElementById('date-start');
const dateEnd = document.getElementById('date-end');
const hourStart = document.getElementById('hour-start');
const hourEnd = document.getElementById('hour-end');
const orderMode = document.getElementById('order-mode');
const comment = document.getElementById('comment');
const bookmarklet = document.getElementById('bookmarklet');
const launchBtn = document.getElementById('launch-btn');
const recopyBtn = document.getElementById('recopy-btn');
const instructions = document.getElementById('instructions');
const scriptOutput = document.getElementById('script-output');

const SURVEY_URL = 'https://survey2.medallia.eu/?feedless-hellomcdo';

// Set default dates
const today = new Date();
const threeDaysAgo = new Date(today);
threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
dateStart.value = threeDaysAgo.toISOString().split('T')[0];
dateEnd.value = today.toISOString().split('T')[0];

function generateScript() {
    const config = {
        restaurantNum: restaurantNum.value,
        dateStart: dateStart.value,
        dateEnd: dateEnd.value,
        hourStart: hourStart.value,
        hourEnd: hourEnd.value,
        orderMode: orderMode.value,
        comment: comment.value.replace(/'/g, "\\'").replace(/\n/g, '\\n')
    };

    const script = `(function(){
const CONFIG = {
    restaurantNum: '${config.restaurantNum}',
    dateStart: '${config.dateStart}',
    dateEnd: '${config.dateEnd}',
    hourStart: '${config.hourStart}',
    hourEnd: '${config.hourEnd}',
    orderMode: '${config.orderMode}',
    comment: '${config.comment}'
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

function click(el) {
    if (!el) return false;
    el.click();
    el.dispatchEvent(new Event('change', {bubbles: true}));
    el.dispatchEvent(new Event('input', {bubbles: true}));
    return true;
}

function getRandomAge() {
    const rand = Math.random() * 100;
    if (rand < 10) return 1;
    if (rand < 40) return 2;
    if (rand < 60) return 3;
    return 4;
}

function getRandomDate() {
    const start = new Date(CONFIG.dateStart);
    const end = new Date(CONFIG.dateEnd);
    const diff = end - start;
    return new Date(start.getTime() + Math.random() * diff);
}

function getRandomHour(date) {
    const [startH, startM] = CONFIG.hourStart.split(':').map(Number);
    const [endH, endM] = CONFIG.hourEnd.split(':').map(Number);
    let maxH = endH, maxM = endM;
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        const currentH = now.getHours() - 1;
        if (currentH < maxH) { maxH = currentH; maxM = now.getMinutes(); }
    }
    const startMin = startH * 60 + startM;
    const endMin = maxH * 60 + maxM;
    const randMin = startMin + Math.floor(Math.random() * (endMin - startMin));
    return { h: String(Math.floor(randMin / 60)).padStart(2, '0'), m: String(randMin % 60).padStart(2, '0') };
}

function detectPage() {
    const text = document.body.innerText.toLowerCase();
    if (text.includes('quel est votre âge') || text.includes('quel est votre age')) return 'age';
    if (text.includes('jour') && text.includes('heure') && text.includes('restaurant')) return 'datetime';
    if (text.includes('borne de commande') || (text.includes('comptoir') && text.includes('drive') && text.includes('livraison'))) return 'ordermode';
    if (text.includes('consommé sur place') || text.includes('pris à emporter')) return 'place';
    if (text.includes('où avez-vous récupéré')) return 'pickup';
    if (text.includes('service de livraison')) return 'delivery';
    if (text.includes('dans quelle mesure') && text.includes('satisfait')) return 'satisfaction';
    if (text.includes('commande était exacte')) return 'exact';
    if (text.includes('problème durant')) return 'problem';
    if (text.includes('domaine') && text.includes('améliorée')) return 'improve';
    if (text.includes('merci') && text.includes('participation')) return 'complete';
    return 'unknown';
}

function fillAge() {
    const radios = document.querySelectorAll('input[type="radio"]');
    const idx = getRandomAge();
    if (radios[idx]) { click(radios[idx]); console.log('Age: option ' + (idx + 1)); return true; }
    return false;
}

function fillDateTime() {
    const date = getRandomDate();
    const time = getRandomHour(date);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    document.querySelectorAll('input').forEach(input => {
        const type = input.type || '';
        const ph = (input.placeholder || '').toLowerCase();
        const parent = input.closest('div')?.innerText?.toLowerCase() || '';

        if (type === 'date' || ph.includes('jj')) {
            input.value = year + '-' + month + '-' + day;
            input.dispatchEvent(new Event('input', {bubbles: true}));
            input.dispatchEvent(new Event('change', {bubbles: true}));
        }
        if (parent.includes('heure') && !parent.includes('minute')) {
            input.value = time.h;
            input.dispatchEvent(new Event('input', {bubbles: true}));
        }
        if (parent.includes('minute')) {
            input.value = time.m;
            input.dispatchEvent(new Event('input', {bubbles: true}));
        }
        if (parent.includes('restaurant') || parent.includes('numéro')) {
            input.value = CONFIG.restaurantNum;
            input.dispatchEvent(new Event('input', {bubbles: true}));
        }
    });
    console.log('DateTime: ' + day + '/' + month + '/' + year + ' ' + time.h + ':' + time.m);
    return true;
}

function fillOrderMode() {
    const radios = document.querySelectorAll('input[type="radio"]');
    let idx = CONFIG.orderMode === 'random' ? Math.floor(Math.random() * radios.length) : parseInt(CONFIG.orderMode) - 1;
    if (radios[idx]) { click(radios[idx]); console.log('Mode: option ' + (idx + 1)); return true; }
    return false;
}

function fillRandom() {
    const radios = document.querySelectorAll('input[type="radio"]');
    if (radios.length > 0) {
        const idx = Math.floor(Math.random() * radios.length);
        click(radios[idx]);
        console.log('Random: option ' + (idx + 1));
        return true;
    }
    return false;
}

function fillSatisfaction() {
    const clickables = document.querySelectorAll('[role="radio"], [class*="scale"] div, [class*="smiley"]');
    if (clickables.length > 0) { click(clickables[0]); console.log('Satisfaction: meilleur'); }

    const ta = document.querySelector('textarea');
    if (ta && CONFIG.comment) {
        ta.value = CONFIG.comment;
        ta.dispatchEvent(new Event('input', {bubbles: true}));
        console.log('Commentaire ajoute');
    }
    return true;
}

function fillExact() {
    const radios = document.querySelectorAll('input[type="radio"]');
    for (const r of radios) {
        const label = r.closest('div')?.innerText?.toLowerCase() || '';
        if (label.includes('oui')) { click(r); console.log('Exacte: Oui'); return true; }
    }
    if (radios[0]) click(radios[0]);
    return true;
}

function fillProblem() {
    const radios = document.querySelectorAll('input[type="radio"]');
    for (const r of radios) {
        const label = r.closest('div')?.innerText?.toLowerCase() || '';
        if (label.includes('non')) { click(r); console.log('Probleme: Non'); return true; }
    }
    if (radios[1]) click(radios[1]);
    return true;
}

function fillImprove() {
    const cbs = document.querySelectorAll('input[type="checkbox"]');
    for (const cb of cbs) {
        const label = cb.closest('div')?.innerText?.toLowerCase() || '';
        if (label.includes('aucune')) { click(cb); console.log('Amelioration: Aucune'); return true; }
    }
    if (cbs.length > 0) click(cbs[cbs.length - 1]);
    return true;
}

function clickNext() {
    for (const btn of document.querySelectorAll('button, [role="button"]')) {
        const text = btn.innerText.toLowerCase();
        if (text.includes('suivant') || text.includes('next')) { btn.click(); console.log('-> Suivant'); return true; }
    }
    return false;
}

async function run() {
    console.log('=== HelloMcDo AutoFiller ===');
    let attempts = 0;

    while (attempts < 35) {
        attempts++;
        await sleep(800);

        const page = detectPage();
        console.log('Page ' + attempts + ': ' + page);

        if (page === 'complete') { console.log('=== TERMINE! ==='); break; }

        switch(page) {
            case 'age': fillAge(); break;
            case 'datetime': fillDateTime(); break;
            case 'ordermode': fillOrderMode(); break;
            case 'place': case 'pickup': case 'delivery': fillRandom(); break;
            case 'satisfaction': fillSatisfaction(); break;
            case 'exact': fillExact(); break;
            case 'problem': fillProblem(); break;
            case 'improve': fillImprove(); break;
            default:
                if (document.querySelectorAll('input[type="radio"]').length > 0) fillRandom();
                else if (document.querySelectorAll('input[type="checkbox"]').length > 0) fillImprove();
        }

        await sleep(500);
        clickNext();
        await sleep(1200);
    }
}

run();
})();`;

    return script;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('Script copie!');
    }).catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    });
}

function updateOutputs() {
    const script = generateScript();
    bookmarklet.href = 'javascript:' + encodeURIComponent(script);
    scriptOutput.value = script;
}

// Launch button - opens survey and copies script
launchBtn.addEventListener('click', () => {
    const script = generateScript();
    copyToClipboard(script);
    window.open(SURVEY_URL, '_blank');
    instructions.classList.remove('hidden');
    launchBtn.textContent = 'Script copie! Questionnaire ouvert';
    launchBtn.style.background = 'linear-gradient(135deg, #4caf50, #45a049)';

    setTimeout(() => {
        launchBtn.textContent = 'Ouvrir le questionnaire + Copier le script';
        launchBtn.style.background = '';
    }, 3000);
});

// Recopy button
recopyBtn.addEventListener('click', () => {
    const script = generateScript();
    copyToClipboard(script);
    recopyBtn.textContent = 'Copie!';
    recopyBtn.style.background = '#4caf50';
    setTimeout(() => {
        recopyBtn.textContent = 'Recopier le script';
        recopyBtn.style.background = '';
    }, 1500);
});

// Event listeners for config changes
[restaurantNum, dateStart, dateEnd, hourStart, hourEnd, orderMode, comment].forEach(el => {
    el.addEventListener('change', updateOutputs);
    el.addEventListener('input', updateOutputs);
});

// Initialize
updateOutputs();
