const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SURVEY_URL = 'https://survey2.medallia.eu/?feedless-hellomcdo';

// Distribution des ages
function getRandomAge() {
    const rand = Math.random() * 100;
    if (rand < 10) return 2;  // 10% -> 15-24 ans
    if (rand < 40) return 3;  // 30% -> 25-34 ans
    if (rand < 60) return 4;  // 20% -> 35-49 ans
    return 5;                  // 40% -> 50+ ans
}

function getRandomDate(startStr, endStr) {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diff = end - start;
    return new Date(start.getTime() + Math.random() * diff);
}

function getRandomHour(date, startHour, endHour) {
    const [startH, startM] = startHour.split(':').map(Number);
    let [endH, endM] = endHour.split(':').map(Number);

    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        const currentH = now.getHours() - 1;
        if (currentH < endH) {
            endH = currentH;
            endM = now.getMinutes();
        }
    }

    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    const randMin = startMin + Math.floor(Math.random() * Math.max(1, endMin - startMin));

    return {
        h: String(Math.floor(randMin / 60)).padStart(2, '0'),
        m: String(randMin % 60).padStart(2, '0')
    };
}

async function fillSurvey(config) {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const logs = [];
    const log = (msg) => {
        console.log(msg);
        logs.push(msg);
    };

    try {
        log('Ouverture du questionnaire...');
        await page.goto(SURVEY_URL, { waitUntil: 'networkidle2', timeout: 30000 });

        for (let attempt = 0; attempt < 35; attempt++) {
            await page.waitForTimeout(1000);

            const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());

            // Detecter la page
            let pageType = 'unknown';
            if (pageText.includes('quel est votre âge') || pageText.includes('quel est votre age')) pageType = 'age';
            else if (pageText.includes('jour') && pageText.includes('heure') && pageText.includes('restaurant')) pageType = 'datetime';
            else if (pageText.includes('borne de commande') || (pageText.includes('comptoir') && pageText.includes('drive'))) pageType = 'ordermode';
            else if (pageText.includes('consommé sur place') || pageText.includes('pris à emporter')) pageType = 'place';
            else if (pageText.includes('où avez-vous récupéré')) pageType = 'pickup';
            else if (pageText.includes('service de livraison')) pageType = 'delivery';
            else if (pageText.includes('dans quelle mesure') && pageText.includes('satisfait')) pageType = 'satisfaction';
            else if (pageText.includes('commande était exacte')) pageType = 'exact';
            else if (pageText.includes('problème durant')) pageType = 'problem';
            else if (pageText.includes('domaine') && pageText.includes('améliorée')) pageType = 'improve';
            else if (pageText.includes('merci') && pageText.includes('participation')) pageType = 'complete';

            log(`Page ${attempt + 1}: ${pageType}`);

            if (pageType === 'complete') {
                log('=== QUESTIONNAIRE TERMINE! ===');
                break;
            }

            // Remplir selon le type de page
            if (pageType === 'age') {
                const ageIdx = getRandomAge();
                await page.evaluate((idx) => {
                    const radios = document.querySelectorAll('input[type="radio"]');
                    if (radios[idx - 1]) radios[idx - 1].click();
                }, ageIdx);
                log(`Age: option ${ageIdx}`);
            }
            else if (pageType === 'datetime') {
                const date = getRandomDate(config.dateStart, config.dateEnd);
                const time = getRandomHour(date, config.hourStart, config.hourEnd);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();

                await page.evaluate((data) => {
                    document.querySelectorAll('input').forEach(input => {
                        const type = input.type || '';
                        const ph = (input.placeholder || '').toLowerCase();
                        const parent = input.closest('div')?.innerText?.toLowerCase() || '';

                        if (type === 'date' || ph.includes('jj')) {
                            input.value = data.dateValue;
                            input.dispatchEvent(new Event('input', {bubbles: true}));
                            input.dispatchEvent(new Event('change', {bubbles: true}));
                        }
                        if (parent.includes('heure') && !parent.includes('minute')) {
                            input.value = data.hour;
                            input.dispatchEvent(new Event('input', {bubbles: true}));
                        }
                        if (parent.includes('minute')) {
                            input.value = data.minute;
                            input.dispatchEvent(new Event('input', {bubbles: true}));
                        }
                        if (parent.includes('restaurant') || parent.includes('numéro')) {
                            input.value = data.restaurant;
                            input.dispatchEvent(new Event('input', {bubbles: true}));
                        }
                    });
                }, {
                    dateValue: `${year}-${month}-${day}`,
                    hour: time.h,
                    minute: time.m,
                    restaurant: config.restaurantNum
                });
                log(`Date: ${day}/${month}/${year} ${time.h}:${time.m}, Restaurant: ${config.restaurantNum}`);
            }
            else if (pageType === 'ordermode') {
                const mode = config.orderMode;
                await page.evaluate((m) => {
                    const radios = document.querySelectorAll('input[type="radio"]');
                    const idx = m === 'random' ? Math.floor(Math.random() * radios.length) : parseInt(m) - 1;
                    if (radios[idx]) radios[idx].click();
                }, mode);
                log(`Mode commande: ${mode}`);
            }
            else if (['place', 'pickup', 'delivery'].includes(pageType)) {
                await page.evaluate(() => {
                    const radios = document.querySelectorAll('input[type="radio"]');
                    if (radios.length > 0) {
                        const idx = Math.floor(Math.random() * radios.length);
                        radios[idx].click();
                    }
                });
                log('Selection aleatoire');
            }
            else if (pageType === 'satisfaction') {
                await page.evaluate((comment) => {
                    const clickables = document.querySelectorAll('[role="radio"], [class*="scale"] div, [class*="smiley"], button');
                    if (clickables.length > 0) clickables[0].click();

                    const ta = document.querySelector('textarea');
                    if (ta && comment) {
                        ta.value = comment;
                        ta.dispatchEvent(new Event('input', {bubbles: true}));
                    }
                }, config.comment);
                log('Satisfaction: meilleur + commentaire');
            }
            else if (pageType === 'exact') {
                await page.evaluate(() => {
                    const radios = document.querySelectorAll('input[type="radio"]');
                    for (const r of radios) {
                        const label = r.closest('div')?.innerText?.toLowerCase() || '';
                        if (label.includes('oui')) { r.click(); return; }
                    }
                    if (radios[0]) radios[0].click();
                });
                log('Commande exacte: Oui');
            }
            else if (pageType === 'problem') {
                await page.evaluate(() => {
                    const radios = document.querySelectorAll('input[type="radio"]');
                    for (const r of radios) {
                        const label = r.closest('div')?.innerText?.toLowerCase() || '';
                        if (label.includes('non')) { r.click(); return; }
                    }
                    if (radios[1]) radios[1].click();
                });
                log('Probleme: Non');
            }
            else if (pageType === 'improve') {
                await page.evaluate(() => {
                    const cbs = document.querySelectorAll('input[type="checkbox"]');
                    for (const cb of cbs) {
                        const label = cb.closest('div')?.innerText?.toLowerCase() || '';
                        if (label.includes('aucune')) { cb.click(); return; }
                    }
                    if (cbs.length > 0) cbs[cbs.length - 1].click();
                });
                log('Amelioration: Aucune');
            }
            else {
                // Page inconnue - essayer radio ou checkbox
                await page.evaluate(() => {
                    const radios = document.querySelectorAll('input[type="radio"]');
                    const cbs = document.querySelectorAll('input[type="checkbox"]');
                    if (radios.length > 0) {
                        radios[Math.floor(Math.random() * radios.length)].click();
                    } else if (cbs.length > 0) {
                        cbs[cbs.length - 1].click();
                    }
                });
            }

            await page.waitForTimeout(500);

            // Cliquer sur Suivant
            await page.evaluate(() => {
                for (const btn of document.querySelectorAll('button, [role="button"]')) {
                    const text = btn.innerText.toLowerCase();
                    if (text.includes('suivant') || text.includes('next')) {
                        btn.click();
                        return;
                    }
                }
            });

            await page.waitForTimeout(1500);
        }

        await browser.close();
        return { success: true, logs };

    } catch (error) {
        log(`Erreur: ${error.message}`);
        await browser.close();
        return { success: false, error: error.message, logs };
    }
}

// Route principale
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'HelloMcDo Bot Server' });
});

// Route pour remplir un questionnaire
app.post('/fill', async (req, res) => {
    const config = {
        restaurantNum: req.body.restaurantNum || '0610',
        dateStart: req.body.dateStart || new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dateEnd: req.body.dateEnd || new Date().toISOString().split('T')[0],
        hourStart: req.body.hourStart || '08:00',
        hourEnd: req.body.hourEnd || '22:00',
        orderMode: req.body.orderMode || 'random',
        comment: req.body.comment || ''
    };

    console.log('Nouvelle requete:', config);

    try {
        const result = await fillSurvey(config);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route pour remplir plusieurs questionnaires
app.post('/fill-multiple', async (req, res) => {
    const count = Math.min(req.body.count || 1, 10); // Max 10
    const config = {
        restaurantNum: req.body.restaurantNum || '0610',
        dateStart: req.body.dateStart || new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dateEnd: req.body.dateEnd || new Date().toISOString().split('T')[0],
        hourStart: req.body.hourStart || '08:00',
        hourEnd: req.body.hourEnd || '22:00',
        orderMode: req.body.orderMode || 'random',
        comment: req.body.comment || ''
    };

    console.log(`Remplissage de ${count} questionnaires`);

    const results = [];
    for (let i = 0; i < count; i++) {
        console.log(`Questionnaire ${i + 1}/${count}`);
        const result = await fillSurvey(config);
        results.push({ index: i + 1, ...result });

        if (i < count - 1) {
            await new Promise(r => setTimeout(r, 3000)); // Pause entre chaque
        }
    }

    res.json({ total: count, results });
});

app.listen(PORT, () => {
    console.log(`Serveur demarre sur le port ${PORT}`);
});
