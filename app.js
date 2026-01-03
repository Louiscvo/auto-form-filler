// Configuration elements
const ageSelect = document.getElementById('age');
const satisfactionRange = document.getElementById('satisfaction');
const satisfactionValue = document.getElementById('satisfaction-value');
const ratingMode = document.getElementById('rating-mode');
const defaultText = document.getElementById('default-text');
const delayInput = document.getElementById('delay');
const autoNextCheckbox = document.getElementById('auto-next');
const bookmarkletLink = document.getElementById('bookmarklet');
const copyBtn = document.getElementById('copy-btn');
const scriptOutput = document.getElementById('script-output');

// Update satisfaction display
satisfactionRange.addEventListener('input', () => {
    satisfactionValue.textContent = satisfactionRange.value;
});

// Generate the auto-fill script
function generateScript() {
    const config = {
        age: ageSelect.value,
        satisfaction: satisfactionRange.value,
        ratingMode: ratingMode.value,
        defaultText: defaultText.value.replace(/'/g, "\\'").replace(/\n/g, '\\n'),
        delay: parseInt(delayInput.value),
        autoNext: autoNextCheckbox.checked
    };

    const script = `(function(){
const CONFIG = {
    age: '${config.age}',
    satisfaction: ${config.satisfaction},
    ratingMode: '${config.ratingMode}',
    defaultText: '${config.defaultText}',
    delay: ${config.delay},
    autoNext: ${config.autoNext}
};

function getRandomRating(mode) {
    switch(mode) {
        case 'max': return 10;
        case 'high': return Math.floor(Math.random() * 3) + 8;
        case 'medium': return Math.floor(Math.random() * 3) + 5;
        case 'random': return Math.floor(Math.random() * 10) + 1;
        default: return 9;
    }
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function clickElement(el) {
    if (!el) return false;
    el.click();
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
}

function fillRadioButtons() {
    // Age question
    const ageRadio = document.querySelector('input[name*="age"][value="' + CONFIG.age + '"]');
    if (ageRadio) {
        clickElement(ageRadio);
        return true;
    }

    // Generic radio buttons - select based on rating mode
    const radioGroups = {};
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        const name = radio.name;
        if (!radioGroups[name]) radioGroups[name] = [];
        radioGroups[name].push(radio);
    });

    let filled = false;
    Object.values(radioGroups).forEach(radios => {
        if (radios.length > 0 && !radios.some(r => r.checked)) {
            // Try to find highest value or use rating logic
            const values = radios.map(r => parseInt(r.value) || 0);
            const maxVal = Math.max(...values);
            const rating = getRandomRating(CONFIG.ratingMode);

            // Map rating 1-10 to available options
            const targetIndex = Math.floor((rating / 10) * radios.length);
            const targetRadio = radios[Math.min(targetIndex, radios.length - 1)] || radios[radios.length - 1];

            if (targetRadio) {
                clickElement(targetRadio);
                filled = true;
            }
        }
    });
    return filled;
}

function fillScaleButtons() {
    // Medallia scale buttons (1-10, stars, etc.)
    const scaleContainers = document.querySelectorAll('[class*="scale"], [class*="rating"], [class*="nps"]');
    let filled = false;

    scaleContainers.forEach(container => {
        const buttons = container.querySelectorAll('button, [role="radio"], label');
        if (buttons.length > 0) {
            const rating = getRandomRating(CONFIG.ratingMode);
            const targetIndex = Math.floor((rating / 10) * buttons.length);
            const btn = buttons[Math.min(targetIndex, buttons.length - 1)];
            if (btn && !btn.classList.contains('selected')) {
                clickElement(btn);
                filled = true;
            }
        }
    });

    // Generic clickable scale items
    document.querySelectorAll('[data-value], [data-score]').forEach(el => {
        const parent = el.closest('[class*="question"], fieldset, [role="radiogroup"]');
        if (parent && !parent.querySelector('.selected, [aria-checked="true"], :checked')) {
            const siblings = parent.querySelectorAll('[data-value], [data-score]');
            const rating = getRandomRating(CONFIG.ratingMode);
            const targetIndex = Math.floor((rating / 10) * siblings.length);
            const target = siblings[Math.min(targetIndex, siblings.length - 1)];
            if (target) {
                clickElement(target);
                filled = true;
            }
        }
    });

    return filled;
}

function fillTextFields() {
    let filled = false;
    document.querySelectorAll('textarea, input[type="text"]:not([readonly])').forEach(field => {
        if (!field.value && field.offsetParent !== null) {
            field.value = CONFIG.defaultText;
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
            filled = true;
        }
    });
    return filled;
}

function fillCheckboxes() {
    let filled = false;
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (!cb.checked && Math.random() > 0.5) {
            clickElement(cb);
            filled = true;
        }
    });
    return filled;
}

function fillDropdowns() {
    let filled = false;
    document.querySelectorAll('select').forEach(select => {
        if (select.selectedIndex <= 0) {
            const options = select.querySelectorAll('option');
            if (options.length > 1) {
                select.selectedIndex = 1;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                filled = true;
            }
        }
    });
    return filled;
}

function clickNext() {
    // Medallia next buttons
    const nextSelectors = [
        'button[id*="forward"]',
        'button[id*="next"]',
        '[class*="next"]',
        '[class*="forward"]',
        'button[type="submit"]',
        'input[type="submit"]',
        'button:contains("Suivant")',
        'button:contains("Next")'
    ];

    for (const selector of nextSelectors) {
        try {
            const btn = document.querySelector(selector);
            if (btn && btn.offsetParent !== null) {
                btn.click();
                return true;
            }
        } catch(e) {}
    }

    // Fallback: find by text content
    const allButtons = document.querySelectorAll('button, input[type="submit"], [role="button"]');
    for (const btn of allButtons) {
        const text = btn.textContent.toLowerCase() || btn.value?.toLowerCase() || '';
        if (text.includes('suivant') || text.includes('next') || text.includes('continuer')) {
            btn.click();
            return true;
        }
    }
    return false;
}

async function autoFill() {
    console.log('🚀 Auto Form Filler - Starting...');

    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
        attempts++;
        console.log('📝 Page attempt ' + attempts);

        await sleep(CONFIG.delay);

        // Try to fill all field types
        const filledRadio = fillRadioButtons();
        const filledScale = fillScaleButtons();
        const filledText = fillTextFields();
        const filledCheck = fillCheckboxes();
        const filledDrop = fillDropdowns();

        const didFill = filledRadio || filledScale || filledText || filledCheck || filledDrop;

        if (didFill) {
            console.log('✅ Fields filled');
        }

        await sleep(CONFIG.delay);

        // Check for completion
        const completionIndicators = document.querySelectorAll('[class*="complete"], [class*="success"], [class*="thank"]');
        if (completionIndicators.length > 0) {
            console.log('🎉 Survey completed!');
            break;
        }

        // Click next if enabled
        if (CONFIG.autoNext) {
            const clicked = clickNext();
            if (clicked) {
                console.log('➡️ Next page');
                await sleep(CONFIG.delay * 2);
            } else if (!didFill) {
                console.log('⏹️ No more actions possible');
                break;
            }
        } else {
            break;
        }
    }

    console.log('✨ Auto Fill completed!');
}

autoFill();
})();`;

    return script;
}

// Update bookmarklet and script output
function updateOutputs() {
    const script = generateScript();
    const minifiedScript = script.replace(/\s+/g, ' ').replace(/\n/g, '');

    bookmarkletLink.href = 'javascript:' + encodeURIComponent(minifiedScript);
    scriptOutput.value = script;
}

// Event listeners
[ageSelect, satisfactionRange, ratingMode, defaultText, delayInput, autoNextCheckbox].forEach(el => {
    el.addEventListener('change', updateOutputs);
    el.addEventListener('input', updateOutputs);
});

// Copy button
copyBtn.addEventListener('click', () => {
    scriptOutput.select();
    document.execCommand('copy');
    copyBtn.textContent = 'Copié !';
    copyBtn.classList.add('copied');
    setTimeout(() => {
        copyBtn.textContent = 'Copier le script';
        copyBtn.classList.remove('copied');
    }, 2000);
});

// Initial generation
updateOutputs();
