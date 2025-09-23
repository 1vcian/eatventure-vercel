let lockInterval = null;
let cardStates = {};
let globalEggCounts = { Common: 0, Rare: 0, Epic: 0, Legendary: 0, Ultimate: 0 };
let authData = { isLoggedIn: false }; // Contiene lo stato dell'utente

// NUOVA GESTIONE DELLO STATO (con debounce per non sovraccaricare il DB)
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

const saveStateToDB = debounce(async () => {
    if (!authData.isLoggedIn || authData.isMember) return; // Non salvare se non loggato o se bannato
    try {
        const stateToSave = { cards: cardStates, eggs: globalEggCounts };
        await fetch('/api/data/saveState', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stateToSave)
        });
    } catch (error) {
        console.error("Failed to save state:", error);
    }
}, 1000); // Salva 1 secondo dopo l'ultima modifica



async function loadStateFromDB() {
    if (!authData.isLoggedIn || authData.isMember) return; // Non caricare se non loggato o bannato
    try {
        const response = await fetch('/api/data/getState');
        if (response.ok) {
            const saved = await response.json();
            if (saved.cards) cardStates = saved.cards;
            if (saved.eggs) globalEggCounts = saved.eggs;
        }
    } catch (error) {
        console.error("Failed to load state:", error);
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    // Selettori per gli elementi da bloccare
  const requiresLoginSelectors = [
        '.card[data-card-id="small"]',
        '.card[data-card-id="pet"]',
        '.card[data-card-id="clan"]',
        '.card[data-card-id="egg_Ultimate"]',
        '.card[data-card-id^="adventure_"]',
        '.card[data-card-id^="event_"]',
        '.global-search-btn'
    ];
    const elementsToLock = document.querySelectorAll(requiresLoginSelectors.join(','));
const removeLockStyles = () => {
    document.querySelectorAll('.lock-wrapper').forEach(wrapper => {
        const originalEl = wrapper.firstChild;
        if (originalEl) {
            // Ripristina gli stili originali dell'elemento
            originalEl.style.filter = '';
            originalEl.style.opacity = '';
            originalEl.style.pointerEvents = ''; // RIATTIVA GLI EVENTI
            
            // Sposta l'elemento fuori dal wrapper e rimuovi il wrapper
            wrapper.parentNode.insertBefore(originalEl, wrapper);
            wrapper.parentNode.removeChild(wrapper);
        }
    });
};

const applyLockStyles = () => {
    const requiresLoginSelectors = [
        '.card[data-card-id="small"]',
        '.card[data-card-id="pet"]',
        '.card[data-card-id="clan"]',
        '.card[data-card-id="egg_Ultimate"]',
        '.card[data-card-id^="adventure_"]',
        '.card[data-card-id^="event_"]',
        '.global-search-btn'
    ];
    
    document.querySelectorAll(requiresLoginSelectors.join(',')).forEach(el => {
        // Se è già bloccato, non fare nulla
        if (el.parentNode.classList.contains('lock-wrapper')) {
            return;
        }

        // --- LA TUA LOGICA ORIGINALE, APPLICATA ALL'ELEMENTO ---
        el.style.filter = 'blur(4px)';
        el.style.opacity = '0.7';
        el.style.pointerEvents = 'none'; // <-- ECColo QUI, RIPRISTINATO!

        // --- LA NUOVA FUNZIONALITÀ AGGIUNTA CORRETTAMENTE ---
        const wrapper = document.createElement('div');
        wrapper.className = 'lock-wrapper';
        el.parentNode.insertBefore(wrapper, el);
        wrapper.appendChild(el);

        const overlay = document.createElement('div');
        overlay.className = 'login-overlay';
        
        const overlayText = el.classList.contains('global-search-btn') ? '🔒' : '🔒 Login to Unlock!';
        overlay.innerHTML = overlayText;
        wrapper.appendChild(overlay);
    });
};

const toggleFeatures = (isLocked) => {
    if (lockInterval) {
        clearInterval(lockInterval);
        lockInterval = null;
    }

    if (isLocked) {
        applyLockStyles();
        // IL TUO CICLO SETINTERVAL, RIPRISTINATO E FUNZIONANTE
        lockInterval = setInterval(applyLockStyles, 100); 
    } else {
        removeLockStyles();
    }
};



    let lastActivityTime = Date.now();
    let userIsLoggedIn = false; // Una variabile per sapere se l'utente è loggato

 let currentUserStatus = null; // Unico oggetto per memorizzare lo stato corrente dell'utente

    // --- FUNZIONE RIUTILIZZABILE PER L'UI ---
    const updateUI = (statusData) => {
        const loggedOutView = document.getElementById('view-logged-out');
        const loggedInView = document.getElementById('view-logged-in');
        const bannedOverlay = document.getElementById('view-banned');

        if (statusData && statusData.isLoggedIn) {
            document.getElementById('user-username').textContent = statusData.user.username;
            document.getElementById('user-avatar').src = statusData.user.avatar;

            if (statusData.isMember) { // Utente loggato MA bannato
                loggedOutView.style.display = 'none';
                loggedInView.style.display = 'block';
                bannedOverlay.style.display = 'flex';
                toggleFeatures(true);
                document.getElementById('lock-message').style.display = 'block';
                document.getElementById('unlock-message').style.display = 'none';
            } else { // Utente loggato e autorizzato
                loggedOutView.style.display = 'none';
                loggedInView.style.display = 'block';
                bannedOverlay.style.display = 'none';
                toggleFeatures(false);
                document.getElementById('lock-message').style.display = 'none';
                document.getElementById('unlock-message').style.display = 'block';
            }
        } else { // Utente non loggato o stato nullo
            loggedOutView.style.display = 'block';
            loggedInView.style.display = 'none';
            bannedOverlay.style.display = 'none';
            toggleFeatures(true);
            document.getElementById('lock-message').style.display = 'none';
            document.getElementById('unlock-message').style.display = 'none';
        }
    };

    // --- LOGICA DI POLLING ATTIVO ---
    const checkUserStatusPeriodically = async () => {
        const userIsActive = (Date.now() - lastActivityTime) < (5 * 60 * 1000); // 2 minuti
        
        // Esegui solo se abbiamo uno stato e l'utente è loggato e attivo
        if (currentUserStatus && currentUserStatus.isLoggedIn && userIsActive) {
            console.log("Utente attivo, forzo l'aggiornamento dello stato...");
            try {
                const response = await fetch('/api/status?force-refresh=true');
                if (!response.ok) throw new Error('Network response was not ok');
                
                const latestStatus = await response.json();

                // Aggiorna la UI SOLO se lo stato di "membro" è cambiato
                if (latestStatus.isMember !== currentUserStatus.isMember) {
                    console.log("Stato 'isMember' cambiato, aggiorno la UI!");
                    currentUserStatus = latestStatus;
                    updateUI(currentUserStatus);
                }
            } catch (error) {
                console.error('Errore nel polling dello stato:', error);
            }
        }
    };

    // --- FUNZIONE PRINCIPALE DI INIZIALIZZAZIONE ---
    const initializeApp = async () => {
        // 1. Controlla lo stato iniziale al caricamento
        try {
            const response = await fetch('/api/status');
            if (!response.ok) throw new Error('Initial status fetch failed');
            
            currentUserStatus = await response.json();
            updateUI(currentUserStatus);
        } catch (error) {
            console.error('Error checking initial login status:', error);
            updateUI(null); // Mostra lo stato di logout in caso di errore
        }

        // 2. Ascolta l'attività dell'utente
        const updateUserActivity = () => { lastActivityTime = Date.now(); };
        window.addEventListener('mousemove', updateUserActivity, { passive: true });
        window.addEventListener('keydown', updateUserActivity, { passive: true });
        window.addEventListener('click', updateUserActivity, { passive: true });
        window.addEventListener('scroll', updateUserActivity, { passive: true });

        // 3. Avvia il timer di controllo PERIODICO solo dopo aver ottenuto lo stato iniziale
        setInterval(checkUserStatusPeriodically, 60 * 1000* 2); // Controlla ogni 2 minuti
    };

    // Avvia tutto
    initializeApp();



document.getElementById('tool-container').addEventListener('click', (event) => {
    // If the user clicks our overlay...
    if (event.target.classList.contains('login-overlay')) {
         toastr.info('Please login with Discord to use this feature!');
    }
});

     document.querySelector('.global-search-btn').addEventListener('click', (event) => {
        if (event.currentTarget.style.filter) {
             toastr.info('Accedi con Discord per usare questa funzionalità!');
        }
    });

    // Gestione del logout
    const handleLogout = async () => {
        await fetch('/api/auth/logout');
        window.location.reload();
    };
    document.getElementById('logout-button-welcome').addEventListener('click', handleLogout);
    document.getElementById('logout-button-banned').addEventListener('click', handleLogout);
    
    // State Management Key
    const STATE_KEY = 'lootSimulatorState_v14_globalEggs'; 
    let currentSearchMode = null, currentSearchCard = null, currentCalcCardId = null; 
    
    // Note: The original 'saveState' and 'loadState' that used localStorage have been removed
    function saveState() { 
    const stateToSave = {
        cards: cardStates,
        eggs: globalEggCounts
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(stateToSave)); 
}
    // to prevent conflict with the database-saving logic at the top of the file.
 function loadState() { 
    const saved = localStorage.getItem(STATE_KEY); 
    if (saved) {
        const parsed = JSON.parse(saved);
        cardStates = parsed.cards || {};
        globalEggCounts = parsed.eggs || { Common: 0, Rare: 0, Epic: 0, Legendary: 0, Ultimate: 0 };
    } else {
        cardStates = {};
        globalEggCounts = { Common: 0, Rare: 0, Epic: 0, Legendary: 0, Ultimate: 0 };
    }
}

    // Game Data
    const LOOT_TABLES = {
        small: { title: 'Small Box', itemsPerChest: 2, totalWeight: 10025, table: [ { result: { type: 'Equipment', rarity: 'Common' }, weight: 6000 }, { result: { type: 'Equipment', rarity: 'Rare' }, weight: 1200 }, { result: { type: 'Equipment', rarity: 'Epic' }, weight: 300 }, { result: { type: 'Pet Egg', rarity: 'Common' }, weight: 100 }, { result: { type: 'Pet Egg', rarity: 'Rare' }, weight: 25 }, { result: { type: 'Pet Food', rarity: 'None' }, weight: 2400 }, ] },
        big: { title: 'Big Box', itemsPerChest: 6, totalWeight: 10025, table: [ { result: { type: 'Equipment', rarity: 'Common' }, weight: 4800 }, { result: { type: 'Equipment', rarity: 'Rare' }, weight: 3000 }, { result: { type: 'Equipment', rarity: 'Epic' }, weight: 1500 }, { result: { type: 'Equipment', rarity: 'Legendary' }, weight: 500 }, { result: { type: 'Pet Egg', rarity: 'Epic' }, weight: 200 }, { result: { type: 'Pet Egg', rarity: 'Legendary' }, weight: 25 }, ] },
        clan: { title: 'Clan Chest', itemsPerChest: 6, totalWeight: 10000, table: [ { result: { type: 'Equipment', rarity: 'Rare' }, weight: 5300 }, { result: { type: 'Equipment', rarity: 'Epic' }, weight: 3300 }, { result: { type: 'Equipment', rarity: 'Legendary' }, weight: 1200 }, { result: { type: 'Equipment', rarity: 'Mythic' }, weight: 200 }, ] },
        event: { title: 'Event Chest', itemsPerChest: 6, totalWeight: 10000, table: [ { result: { type: 'Equipment', rarity: 'Common' }, weight: 4800 }, { result: { type: 'Equipment', rarity: 'Rare' }, weight: 3000 }, { result: { type: 'Equipment', rarity: 'Epic' }, weight: 1500 }, { result: { type: 'Equipment', rarity: 'Legendary' }, weight: 500 }, { result: { type: 'Equipment', rarity: 'Ultimate' }, weight: 200 }, ] },
        pet: { title: 'Pet Box', itemsPerChest: 3, totalWeight: 9990, table: [ { result: { type: 'Pet Egg', rarity: 'Common' }, weight: 5900 }, { result: { type: 'Pet Egg', rarity: 'Rare' }, weight: 2800 }, { result: { type: 'Pet Egg', rarity: 'Epic' }, weight: 1100 }, { result: { type: 'Pet Egg', rarity: 'Legendary' }, weight: 140 }, { result: { type: 'Pet Egg', rarity: 'Ultimate' }, weight: 50 }, ] }
    };

    const ADVENTURE_LOOT_RATES = [
        // Level, Common, Rare, Epic, Legendary, Ultimate, Mythic, Items Count
        { level: 1, rates: { Common: 99.15, Rare: 0.85 }, items: 1 }, { level: 2, rates: { Common: 98.30, Rare: 1.70 }, items: 1 },
        { level: 3, rates: { Common: 97.45, Rare: 2.55 }, items: 1 }, { level: 4, rates: { Common: 96.60, Rare: 3.40 }, items: 1 },
        { level: 5, rates: { Common: 95.75, Rare: 4.25 }, items: 2 }, { level: 6, rates: { Common: 94.90, Rare: 5.10 }, items: 2 },
        { level: 7, rates: { Common: 94.05, Rare: 5.95 }, items: 2 }, { level: 8, rates: { Common: 93.20, Rare: 6.80 }, items: 2 },
        { level: 9, rates: { Common: 92.35, Rare: 7.65 }, items: 2 }, { level: 10, rates: { Common: 91.10, Rare: 8.50, Epic: 0.40 }, items: 2 },
        { level: 11, rates: { Common: 89.85, Rare: 9.35, Epic: 0.80 }, items: 2 }, { level: 12, rates: { Common: 88.60, Rare: 10.20, Epic: 1.20 }, items: 2 },
        { level: 13, rates: { Common: 87.35, Rare: 11.05, Epic: 1.60 }, items: 2 }, { level: 14, rates: { Common: 86.10, Rare: 11.90, Epic: 2.00 }, items: 2 },
        { level: 15, rates: { Common: 84.85, Rare: 12.75, Epic: 2.40 }, items: 2 }, { level: 16, rates: { Common: 83.60, Rare: 13.60, Epic: 2.80 }, items: 2 },
        { level: 17, rates: { Common: 82.35, Rare: 14.45, Epic: 3.20 }, items: 2 }, { level: 18, rates: { Common: 81.10, Rare: 15.30, Epic: 3.60 }, items: 2 },
        { level: 19, rates: { Common: 79.85, Rare: 16.15, Epic: 4.00 }, items: 2 }, { level: 20, rates: { Common: 78.48, Rare: 17.00, Epic: 4.40, Legendary: 0.12 }, items: 2 },
        { level: 21, rates: { Common: 77.11, Rare: 17.85, Epic: 4.80, Legendary: 0.24 }, items: 2 }, { level: 22, rates: { Common: 75.74, Rare: 18.70, Epic: 5.20, Legendary: 0.36 }, items: 2 },
        { level: 23, rates: { Common: 74.37, Rare: 19.55, Epic: 5.60, Legendary: 0.48 }, items: 2 }, { level: 24, rates: { Common: 73.00, Rare: 20.40, Epic: 6.00, Legendary: 0.60 }, items: 2 },
        { level: 25, rates: { Common: 71.63, Rare: 21.25, Epic: 6.40, Legendary: 0.72 }, items: 3 }, { level: 26, rates: { Common: 70.26, Rare: 22.10, Epic: 6.80, Legendary: 0.84 }, items: 3 },
        { level: 27, rates: { Common: 68.89, Rare: 22.95, Epic: 7.20, Legendary: 0.96 }, items: 3 }, { level: 28, rates: { Common: 67.52, Rare: 23.80, Epic: 7.60, Legendary: 1.08 }, items: 3 },
        { level: 29, rates: { Common: 66.15, Rare: 24.65, Epic: 8.00, Legendary: 1.20 }, items: 3 }, { level: 30, rates: { Common: 64.74, Rare: 25.50, Epic: 8.40, Legendary: 1.32, Ultimate: 0.04 }, items: 3 },
        { level: 31, rates: { Common: 63.33, Rare: 26.35, Epic: 8.80, Legendary: 1.44, Ultimate: 0.08 }, items: 3 }, { level: 32, rates: { Common: 61.92, Rare: 27.20, Epic: 9.20, Legendary: 1.56, Ultimate: 0.12 }, items: 3 },
        { level: 33, rates: { Common: 60.51, Rare: 28.05, Epic: 9.60, Legendary: 1.68, Ultimate: 0.16 }, items: 3 }, { level: 34, rates: { Common: 59.10, Rare: 28.90, Epic: 10.00, Legendary: 1.80, Ultimate: 0.20 }, items: 3 },
        { level: 35, rates: { Common: 57.69, Rare: 29.75, Epic: 10.40, Legendary: 1.92, Ultimate: 0.24 }, items: 3 }, { level: 36, rates: { Common: 56.88, Rare: 30.00, Epic: 10.80, Legendary: 2.04, Ultimate: 0.28 }, items: 3 },
        { level: 37, rates: { Common: 56.32, Rare: 30.00, Epic: 11.20, Legendary: 2.16, Ultimate: 0.32 }, items: 3 }, { level: 38, rates: { Common: 55.76, Rare: 30.00, Epic: 11.60, Legendary: 2.28, Ultimate: 0.36 }, items: 3 },
        { level: 39, rates: { Common: 55.20, Rare: 30.00, Epic: 12.00, Legendary: 2.40, Ultimate: 0.40 }, items: 3 }, { level: 40, rates: { Common: 54.64, Rare: 30.00, Epic: 12.40, Legendary: 2.52, Ultimate: 0.44 }, items: 4 },
        { level: 41, rates: { Common: 54.08, Rare: 30.00, Epic: 12.80, Legendary: 2.64, Ultimate: 0.48 }, items: 4 }, { level: 42, rates: { Common: 53.52, Rare: 30.00, Epic: 13.20, Legendary: 2.76, Ultimate: 0.52 }, items: 4 },
        { level: 43, rates: { Common: 52.96, Rare: 30.00, Epic: 13.60, Legendary: 2.88, Ultimate: 0.56 }, items: 4 }, { level: 44, rates: { Common: 52.40, Rare: 30.00, Epic: 14.00, Legendary: 3.00, Ultimate: 0.60 }, items: 4 },
        { level: 45, rates: { Common: 51.84, Rare: 30.00, Epic: 14.40, Legendary: 3.12, Ultimate: 0.64 }, items: 4 }, { level: 46, rates: { Common: 51.28, Rare: 30.00, Epic: 14.80, Legendary: 3.24, Ultimate: 0.68 }, items: 4 },
        { level: 47, rates: { Common: 50.92, Rare: 30.00, Epic: 15.00, Legendary: 3.36, Ultimate: 0.72 }, items: 4 }, { level: 48, rates: { Common: 50.76, Rare: 30.00, Epic: 15.00, Legendary: 3.48, Ultimate: 0.76 }, items: 4 },
        { level: 49, rates: { Common: 50.60, Rare: 30.00, Epic: 15.00, Legendary: 3.60, Ultimate: 0.80 }, items: 4 },
        { level: 50, rates: { Common: 50.42, Rare: 30.00, Epic: 15.00, Legendary: 3.72, Ultimate: 0.84, Mythic: 0.02 }, items: 4 },
        { level: 51, rates: { Common: 50.24, Rare: 30.00, Epic: 15.00, Legendary: 3.84, Ultimate: 0.88, Mythic: 0.04 }, items: 4 }, { level: 52, rates: { Common: 50.06, Rare: 30.00, Epic: 15.00, Legendary: 3.96, Ultimate: 0.92, Mythic: 0.06 }, items: 4 },
        { level: 53, rates: { Common: 49.88, Rare: 30.00, Epic: 15.00, Legendary: 4.08, Ultimate: 0.96, Mythic: 0.08 }, items: 4 }, { level: 54, rates: { Common: 49.70, Rare: 30.00, Epic: 15.00, Legendary: 4.20, Ultimate: 1.00, Mythic: 0.10 }, items: 4 },
        { level: 55, rates: { Common: 49.52, Rare: 30.00, Epic: 15.00, Legendary: 4.32, Ultimate: 1.04, Mythic: 0.12 }, items: 4 }, { level: 56, rates: { Common: 49.34, Rare: 30.00, Epic: 15.00, Legendary: 4.44, Ultimate: 1.08, Mythic: 0.14 }, items: 4 },
        { level: 57, rates: { Common: 49.16, Rare: 30.00, Epic: 15.00, Legendary: 4.56, Ultimate: 1.12, Mythic: 0.16 }, items: 4 }, { level: 58, rates: { Common: 48.98, Rare: 30.00, Epic: 15.00, Legendary: 4.68, Ultimate: 1.16, Mythic: 0.18 }, items: 4 },
        { level: 59, rates: { Common: 48.80, Rare: 30.00, Epic: 15.00, Legendary: 4.80, Ultimate: 1.20, Mythic: 0.20 }, items: 4 }, { level: 60, rates: { Common: 48.62, Rare: 30.00, Epic: 15.00, Legendary: 4.92, Ultimate: 1.24, Mythic: 0.22 }, items: 5 },
        { level: 61, rates: { Common: 48.48, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 1.28, Mythic: 0.24 }, items: 5 }, { level: 62, rates: { Common: 48.42, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 1.32, Mythic: 0.26 }, items: 5 },
        { level: 63, rates: { Common: 48.36, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 1.36, Mythic: 0.28 }, items: 5 }, { level: 64, rates: { Common: 48.30, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 1.40, Mythic: 0.30 }, items: 5 },
        { level: 65, rates: { Common: 48.24, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 1.44, Mythic: 0.32 }, items: 5 }, { level: 66, rates: { Common: 48.18, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 1.48, Mythic: 0.34 }, items: 5 },
        { level: 67, rates: { Common: 48.12, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 1.52, Mythic: 0.36 }, items: 5 }, { level: 68, rates: { Common: 48.06, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 1.56, Mythic: 0.38 }, items: 5 },
        { level: 69, rates: { Common: 48.00, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 1.60, Mythic: 0.40 }, items: 5 }, { level: 70, rates: { Common: 47.94, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 1.64, Mythic: 0.42 }, items: 5 },
        { level: 71, rates: { Common: 47.88, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 1.68, Mythic: 0.44 }, items: 5 }, { level: 72, rates: { Common: 47.82, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 1.72, Mythic: 0.46 }, items: 5 },
        { level: 73, rates: { Common: 47.76, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 1.76, Mythic: 0.48 }, items: 5 }, { level: 74, rates: { Common: 47.70, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 1.80, Mythic: 0.50 }, items: 5 },
        { level: 75, rates: { Common: 47.64, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 1.84, Mythic: 0.52 }, items: 5 }, { level: 76, rates: { Common: 47.58, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 1.88, Mythic: 0.54 }, items: 5 },
        { level: 77, rates: { Common: 47.52, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 1.92, Mythic: 0.56 }, items: 5 }, { level: 78, rates: { Common: 47.46, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 1.96, Mythic: 0.58 }, items: 5 },
        { level: 79, rates: { Common: 47.40, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 0.60 }, items: 5 }, { level: 80, rates: { Common: 47.38, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 0.62 }, items: 5 },
        { level: 81, rates: { Common: 47.36, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 0.64 }, items: 5 }, { level: 82, rates: { Common: 47.34, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 0.66 }, items: 5 },
        { level: 83, rates: { Common: 47.32, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 0.68 }, items: 5 }, { level: 84, rates: { Common: 47.30, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 0.70 }, items: 5 },
        { level: 85, rates: { Common: 47.28, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 0.72 }, items: 5 }, { level: 86, rates: { Common: 47.26, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 0.74 }, items: 5 },
        { level: 87, rates: { Common: 47.24, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 0.76 }, items: 5 }, { level: 88, rates: { Common: 47.22, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 0.78 }, items: 5 },
        { level: 89, rates: { Common: 47.20, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 0.80 }, items: 5 }, { level: 90, rates: { Common: 47.18, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 0.82 }, items: 5 },
        { level: 91, rates: { Common: 47.16, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 0.84 }, items: 5 }, { level: 92, rates: { Common: 47.14, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 0.86 }, items: 5 },
        { level: 93, rates: { Common: 47.12, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 0.88 }, items: 5 }, { level: 94, rates: { Common: 47.10, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 0.90 }, items: 5 },
        { level: 95, rates: { Common: 47.08, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 0.92 }, items: 5 }, { level: 96, rates: { Common: 47.06, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 0.94 }, items: 5 },
        { level: 97, rates: { Common: 47.04, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 0.96 }, items: 5 }, { level: 98, rates: { Common: 47.02, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 0.98 }, items: 5 },
        { level: 99, rates: { Common: 47.00, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 1.00 }, items: 5 }, { level: 100, rates: { Common: 47.00, Rare: 30.00, Epic: 15.00, Legendary: 5.00, Ultimate: 2.00, Mythic: 1.00 }, items: 5 }
    ];

    const ITEM_POOLS = {
        Common: ["Hat_Cashier","Hat_Barista","Hat_Beanie","Hat_Chef","Hat_Cashier_Blue","Body_Barista","Body_BlueWhite","Body_RedGray","Body_WhiteShirt_Belt","Body_RedShirt_Belt","Tool_WoodSpoon","Tool_MetalSpatula","Tool_Hammer","Tool_SoupSpoon","Tool_Knife"],
        Rare: ["Hat_SushiChef","Hat_TrafficCone","Hat_Round","Hat_Fireman","Hat_CoolCap","Body_JumperYellow","Body_JumperRedBlue","Body_Waiter","Body_BowTieRed","Body_Apron_White","Tool_NoodleSpoon","Tool_FlourSpoon","Tool_CheeseGrater","Tool_KetchupBottle","Tool_Broom"],
        Epic: ["Hat_Hoodie","Hat_Glasses","Hat_Mafia","Hat_Chef_Black","Hat_ChefTall","Body_Coat","Body_Box","Body_Kimono_Black","Body_JumperBlackWhite","Body_Apron_Purple","Tool_Whisk","Tool_RollingPin","Tool_PizzaCutter","Tool_Mug","Tool_Wok"],
        Legendary: ["Hat_Leperchaun","Hat_ElderBeard","Hat_ChefTall_Dark","Hat_CapPurple","Hat_SushiMaster","Body_ItalianChef","Body_TankTop_White","Body_ToolBelt","Body_Kimono_Blue","Body_Barrel","Tool_Mixer","Tool_PepperMill","Tool_ChopSticks","Tool_CookBook","Tool_Chopper"],
        Mythic: ["Body_WarriorApron","Hat_WarriorHelmet","Tool_WarriorCleaver","Tool_WarriorTenderiser"],
        Ultimate_MiddleAges: ["Body_RoyalRobe","Hat_RoyalCrown","Tool_RoyalSceptre"],
        Ultimate_Mine: ["Body_ToolBelt","Hat_MineLamp","Tool_Pickaxe_Special"],
        Ultimate_SeaPort: ["Body_Shark","Head_Shark","Tool_Anchor"],
        Ultimate_Space: ["Body_Robot","Head_Robot","Tool_LaserGun"],
        Ultimate_Alchemist: ["Body_Bandolier","Hat_Goggles","Tool_Flask"],

        Common_Zeus: ["Ring_Bronze","Ring_Wooden","Ring_Rubber","Ring_Plaster"],
        Rare_Zeus: ["Ring_Silver","Ring_Onion","Ring_Candy","Ring_Plastic"],
        Epic_Zeus: ["Ring_Gold","Ring_Wreath","Ring_Bagel","Ring_Donut"],
        Legendary_Zeus: ["Ring_Snake","Ring_Bee","Ring_Lucky","Ring_Winged"],
        Ultimate_Zeus: ["Ring_Evil","Ring_Nature","Ring_Sea","Ring_Love"],
        Mythic_Zeus: ["Ring_Thunder"],

        Common_Pirate: ["Necklace_Lai","Necklace_Bow","Necklace_Scarf","Necklace_Bands"],
        Rare_Pirate: ["Necklace_Bandana","Necklace_Salt","Necklace_Shelfish","Necklace_Leather"],
        Epic_Pirate: ["Necklace_Pearls","Necklace_Gold","Necklace_Diamond","Necklace_Dog"],
        Legendary_Pirate: ["Necklace_Sausage","Necklace_Compass","Necklace_Beads","Necklace_Shark"],
        Ultimate_Pirate: ["Necklace_Nazar","Necklace_Pirate","Necklace_Anchor","Necklace_Key"],
        Mythic_Pirate: ["Necklace_Trident"],
        
        CommonEgg: ["Pet_Egg_Common"], RareEgg: ["Pet_Egg_Rare"], EpicEgg: ["Pet_Egg_Epic"], LegendaryEgg: ["Pet_Egg_Legendary"], UltimateEgg: ["Pet_Egg_Ultimate"],
        RarePet: ["Pet_HouseCat", "Pet_GoldenRetriever"],
        EpicPet: ["Pet_DarkHorse", "Pet_Penguin", "Pet_Pony", "Pet_Tortoise", "Pet_Turtle"],
        LegendaryPet: ["Pet_Panda", "Pet_Roomba"],
        UltimatePet: ["Pet_BabyDragon", "Pet_RedPanda", "Pet_Mole", "Pet_BabyKraken"]
    };

    const XP_VALUES_ITEMS = { Common: 4, Rare: 9, Epic: 22, Legendary: 26, Ultimate: 61, Mythic: 144 };
    const XP_VALUES_EGGS = { Common: 25, Rare: 50, Epic: 150, Legendary: 425, Ultimate: 1000 };

    const AVERAGE_XP = {};
    (function calculateAverageXps() {
        for (const chestId in LOOT_TABLES) {
            if (chestId === 'event') continue;
            const chest = LOOT_TABLES[chestId];
            let avgXpPerItem = 0;
            for (const drop of chest.table) {
                const prob = drop.weight / chest.totalWeight;
                const rarityKey = drop.result.rarity.charAt(0).toUpperCase() + drop.result.rarity.slice(1);
                let xp = 0;
                if (drop.result.type === 'Pet Egg') {
                    xp = XP_VALUES_EGGS[rarityKey] || 0;
                } else if (drop.result.type === 'Equipment') {
                    xp = XP_VALUES_ITEMS[rarityKey] || 0;
                }
                avgXpPerItem += prob * xp;
            }
            AVERAGE_XP[chestId] = avgXpPerItem * chest.itemsPerChest;
        }
        const eventChest = LOOT_TABLES['event'];
        let avgXpPerItem = 0;
        for (const drop of eventChest.table) {
            const prob = drop.weight / eventChest.totalWeight;
            const rarityKey = drop.result.rarity.charAt(0).toUpperCase() + drop.result.rarity.slice(1);
            avgXpPerItem += prob * (XP_VALUES_ITEMS[rarityKey] || 0);
        }
        AVERAGE_XP['event'] = avgXpPerItem * eventChest.itemsPerChest;
    })();

    function getAverageXpForAdventure(level) {
        const levelData = ADVENTURE_LOOT_RATES[level - 1];
        if (!levelData) return 0;
        let avgXpPerItem = 0;
        for (const rarity in levelData.rates) {
            const prob = levelData.rates[rarity] / 100;
            const rarityKey = rarity.charAt(0).toUpperCase() + rarity.slice(1);
            const xp = XP_VALUES_ITEMS[rarityKey] || 0;
            avgXpPerItem += prob * xp;
        }
        return avgXpPerItem * levelData.items;
    }

    toastr.options = { "positionClass": "toast-top-center" };

    // Simulation Logic
    function determinePrizeType(roll, table) {
        let cumulativeWeight = 0;
        for (const item of table) {
            cumulativeWeight += item.weight;
            if (roll < cumulativeWeight) return item.result;
        }
        return table[table.length - 1].result;
    }

    function getSpecificItem(rng, prize, eventType = null) {
        let itemName = "N/A", itemRoll = -1, baseName = '', actualRarity = prize.rarity;
        if (prize.type === 'Pet Food') {
            itemRoll = rng.range(6, 15); itemName = `${itemRoll} Pet Food`; baseName = 'PetFood'; actualRarity="Common";
        } else {
            let poolName = prize.rarity;
            if (prize.type === 'Pet Egg') poolName += 'Egg';
            if (eventType === 'Zeus' || eventType === 'Pirate') { poolName += '_' + eventType; } 
            else if (prize.rarity === 'Ultimate' && eventType && eventType!='pet_box') { poolName += '_' + eventType; }
            const pool = ITEM_POOLS[poolName] || [];

            itemRoll = eventType=='pet_box'?0:rng.range(0, pool.length);
            baseName = pool[itemRoll] || `${poolName}_NotFound`;
            itemName = `${prize.type}: ${baseName} (${prize.rarity})`;
        }
        return { itemName, itemRoll, baseName, rarity: actualRarity };
    }

    function simulateAdventureChestOpening(seed, level, eventType, vaultPercentage,typeAdventure='') {
        const rng = new UnityRandom(seed);
        const items = [];
        const whatIfItems = [];
        let keyDropsAt = -1;
        let keyDropsAt2 = -1;

        const levelData = ADVENTURE_LOOT_RATES[level - 1];
        if (!levelData) return { items: [], nextSeed: seed, error: "Invalid level" };
        
        const table = [];
        let totalWeight = 0;
        for (const [rarity, rate] of Object.entries(levelData.rates)) {
            const weight = rate * 10000;
            table.push({ result: { type: 'Equipment', rarity: rarity }, weight: weight });
            totalWeight += weight;
        }
        
        for (let i = 0; i < levelData.items; i++) {
            const typeRoll = rng.range(0, totalWeight);
            const prize = determinePrizeType(typeRoll, table);
            const { itemName, itemRoll, baseName, rarity } = getSpecificItem(rng, prize, eventType);
            items.push({ name: itemName, typeRoll, itemRoll, baseName, rarity, level: level });
        }

        if (vaultPercentage > 0 || 1) {
            const keyRoll = rng.range(0, 100);
            if (keyRoll < vaultPercentage) {
                items.push({ name: `${eventType} Vault Key`, baseName: typeAdventure.includes('Zeus') ? 'ZeusKeyIcon' : 'PirateKeyIcon', rarity: 'Common', typeRoll: 'Vault', itemRoll: 'Key', level: level });
            }
            for (let i = 1; i <= 35; i++) {
                if (keyRoll < i) {
                    keyDropsAt = i;
                    break;
                }
            }
            for (let i = 1; i <= 100; i++) {
                if (keyRoll < i) {
                    keyDropsAt2 = i;
                    break;
                }
            }
        }

        if (level < 100) {
            const nextLevelData = ADVENTURE_LOOT_RATES[level];
            const nextRng = new UnityRandom(seed);
            const nextTable = [];
            let nextTotalWeight = 0;
            for (const [rarity, rate] of Object.entries(nextLevelData.rates)) {
                const weight = rate * 10000;
                nextTable.push({ result: { type: 'Equipment', rarity: rarity }, weight: weight });
                nextTotalWeight += weight;
            }

            for (let i = 0; i < nextLevelData.items; i++) {
                const typeRoll = nextRng.range(0, nextTotalWeight);
                const prize = determinePrizeType(typeRoll, nextTable);
                const { itemName, itemRoll, baseName, rarity } = getSpecificItem(nextRng, prize, eventType);
                whatIfItems.push({ name: itemName, typeRoll, itemRoll, baseName, rarity, level: level + 1 });
            }
        }

        return { items, nextSeed: rng.range(0, 2147483647), whatIfItems, keyDropsAt,keyDropsAt2 };
    }

    function simulateChestOpening(seed, config, eventType = null) {
        const rng = new UnityRandom(seed); const items = [];
    
        for (let i = 0; i < config.itemsPerChest; i++) {
            const typeRoll = rng.range(0, config.totalWeight);
            const prize = determinePrizeType(typeRoll, config.table);
            const { itemName, itemRoll, baseName, rarity } = getSpecificItem(rng, prize, config.title == 'Pet Box'?'pet_box':eventType);
            items.push({ name: itemName, typeRoll, itemRoll, baseName, rarity });
        }
        if (config.title === 'Pet Box') {
            items.push({ name: '150 Pet Food', typeRoll: 'Guaranteed', itemRoll: '150', baseName: 'PetFood', rarity: 'common' });
        }
        return { items, nextSeed: rng.range(0, 2147483647) };
    }

    function simulateEggOpening(seed, rarity) {
        const rng = new UnityRandom(seed); const pool = ITEM_POOLS[rarity + 'Pet'] || [];
        const itemRoll = rng.range(0, pool.length);
        const baseName = pool[itemRoll]; const itemName = `Pet: ${baseName} (${rarity})`;
        return { items: [{ name: itemName, typeRoll: 'N/A', itemRoll, baseName, rarity }], nextSeed: rng.range(0, 2147483647) };
    }

    // Helper function to get XP for an item
    function getItemXp(item) {
        if (!item || !item.rarity || item.baseName === 'PetFood' || (item.baseName && item.baseName.endsWith('Key'))) {
            return 0;
        }
        const normalizedRarity = item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1);
        if (item.name.startsWith('Pet Egg')) {
            return XP_VALUES_EGGS[normalizedRarity] || 0;
        } else { // Equipment or Pet from egg
            return XP_VALUES_ITEMS[normalizedRarity] || 0;
        }
    }

    // UI Functions
    function formatItemDisplay(item) {
        const rarity = item.rarity || 'common';
        const itemXp = getItemXp(item);
        const xpDisplay = itemXp > 0 ? `<span class="item-xp-label">+${itemXp} XP</span>` : '';
        let formattedRarity = ` <span class="label-rarity" ><strong>${item.baseName!="PetFood"?rarity:(item.itemRoll+" x PetFood")}</strong></span>`;
        let imageHtml = `<img src="./src/${item.baseName}.png" alt="${item.baseName}" class="item-image me-2" onerror="this.src='./src/BigChestIcon.png';" onclick="selectItemForSearch('${item.baseName}', '${rarity}')" title="Click to search for this item">`;
        const nameWithoutRarity = item.name.replace(/ \((.*)\)/, '');
        return `<div class="item-card rarity-${rarity.toLowerCase()}">${xpDisplay} ${imageHtml}<span class="debug">${nameWithoutRarity}</span>${formattedRarity}</div>`;
    }

    function getCardElements(card) {
        return {
            cardId: card.dataset.cardId, seedInput: card.querySelector('.seed-input'), levelInput: card.querySelector('.level-input'), vaultInput: card.querySelector('.vault-percentage-input'), resultsDiv: card.querySelector('.results-container'), counterSpan: card.querySelector('.counter'), xpCounter: card.querySelector('.xp-counter'), petfoodCounter: card.querySelector('.petfood-counter'), toggleBtn: card.querySelector('.toggle-btn'),
            whatIfBtn: card.querySelector('button[data-action="toggle-what-if"]') 
        };
    }

    function renderCard(cardId) {
        const card = document.querySelector(`.card[data-card-id="${cardId}"]`); if (!card) return;
        const { seedInput, resultsDiv, counterSpan, toggleBtn, xpCounter, petfoodCounter, whatIfBtn } = getCardElements(card);
        const state = cardStates[cardId] || { initialSeed: null, history: [], isHistoryVisible: false, isWhatIfVisible: false };
        let currentSeed = state.initialSeed;
        const historyWithSeeds = [];
        let totalXp = 0, totalPetFood = 0;
        if (state.initialSeed !== null) {
            state.history.forEach(action => {
                const seedForThisAction = currentSeed;
                let result;
                if (action.type === 'egg') { result = simulateEggOpening(currentSeed, action.rarity); } 
                else if (action.type.startsWith('adventure')) { result = simulateAdventureChestOpening(currentSeed, action.level, action.eventType, action.vaultPercentage,action.type); } 
                else { const config = LOOT_TABLES[action.type === 'event' ? 'event' : action.type]; result = simulateChestOpening(currentSeed, config, action.eventType); }
                result.items.forEach(item => {
                    totalXp += getItemXp(item);
                    if (item.baseName === 'PetFood') { totalPetFood += Number(item.itemRoll || 0); }
                });
                historyWithSeeds.push({ ...action, ...result, usedSeed: seedForThisAction });
                currentSeed = result.nextSeed;
            });
        }
        seedInput.value = currentSeed || state.initialSeed || '';
        counterSpan.textContent = `Opened: ${state.history.length}`;
        if (xpCounter) xpCounter.textContent = `Total XP: ${totalXp}`;
        if (petfoodCounter) petfoodCounter.textContent = `Pet Food: ${totalPetFood}`;

        const headerDetails = card.querySelector('.chest-header .d-flex');
        if (xpCounter && headerDetails) {
            let userAvgDisplay = headerDetails.querySelector('.user-avg-xp');
            if (!userAvgDisplay) {
                userAvgDisplay = document.createElement('small');
                userAvgDisplay.className = 'user-avg-xp';
                headerDetails.appendChild(userAvgDisplay);
            }
            const userAvgXp = state.history.length > 0 ? (totalXp / state.history.length).toFixed(2) : 0;
            userAvgDisplay.textContent = `Your Avg XP: ${userAvgXp}`;

            let theoreticalAvgDisplay = headerDetails.querySelector('.theoretical-avg-xp');
            if (!theoreticalAvgDisplay) {
                theoreticalAvgDisplay = document.createElement('small');
                theoreticalAvgDisplay.className = 'theoretical-avg-xp';
                headerDetails.appendChild(theoreticalAvgDisplay);
            }
            
            let theoreticalAvgXp = 0;
            const [chestType] = cardId.includes('_') ? cardId.split('_') : [cardId, null];
            
            if (chestType.startsWith('adventure')) {
                const level = parseInt(card.querySelector('.level-input')?.value, 10) || 1;
                theoreticalAvgXp = getAverageXpForAdventure(level);
            } else if (cardId.startsWith('event')) {
                theoreticalAvgXp = AVERAGE_XP['event'];
            } else if (AVERAGE_XP[chestType]) {
                theoreticalAvgXp = AVERAGE_XP[chestType];
            }
            
            if (!cardId.startsWith('egg_')) {
                theoreticalAvgDisplay.textContent = `Avg XP: ${theoreticalAvgXp.toFixed(2)}`;
            } else {
                 theoreticalAvgDisplay.textContent = '';
            }
        }

        if (whatIfBtn) {
            if (state.isWhatIfVisible) {
                whatIfBtn.classList.remove('btn-danger');
                whatIfBtn.classList.add('btn-success');
            } else {
                whatIfBtn.classList.remove('btn-success');
                whatIfBtn.classList.add('btn-danger');
            }
        }

        resultsDiv.innerHTML = '';
        const resultsToShow = state.isHistoryVisible ? historyWithSeeds : historyWithSeeds.slice(-1);
        resultsToShow.forEach((res, index) => {
            const entryDiv = document.createElement('div'); entryDiv.className = 'loot-entry p-3';
            const itemsHtml = res.items.map((item, i) => `<div class="col"><div style="display: flex; justify-content: center; padding: 5px;">${formatItemDisplay(item)}</div></div>`).join('');
            const chestTotalXp = res.items.reduce((sum, item) => sum + getItemXp(item), 0);
            const chestXpDisplay = chestTotalXp > 0 ? `<div class="text-center fw-bold text-warning mt-2">Chest XP: +${chestTotalXp}</div>` : '';
            let title = res.title;
            if (!title) {
                if (res.type === 'egg') title = `${res.rarity} Egg`;
                else if (res.type .startsWith('adventure')) title = `${res.eventType} Box (Lvl ${res.level})`;
                else { const config = LOOT_TABLES[res.type === 'event' ? 'event' : res.type]; title = res.eventType ? `Event: ${res.eventType}` : config.title; }
            }
            const historyIndex = state.history.length - (resultsToShow.length - 1) + index;

            let whatIfHtml = '';
            if (res.type.startsWith('adventure') && state.isWhatIfVisible) {
                const whatIfItemsHtml = res.whatIfItems.map(item => `<div class="col"><div style="display: flex; justify-content: center; padding: 5px;">${formatItemDisplay(item)}</div></div>`).join('');
                const keyInfoHtml = res.keyDropsAt > 0 
                    ? `<i class="fas fa-key text-warning"></i> Key would drop at <strong>${res.keyDropsAt}%</strong> vault chance.`
                    : `<i class="fas fa-times text-danger"></i> No key drop up to 35% vault chance.`;
                const keyInfoHtml2 = res.keyDropsAt!= res.keyDropsAt2
                    ? `<i class="fas fa-key text-danger"></i> Key would drop at <strong>${res.keyDropsAt2}%</strong> vault chance but it's impossible.`
                    : ``;
                    
                whatIfHtml = `
                    <hr class="my-2">
                    <div class="what-if-section mt-2">
                        <h6 class="text-info"><i class="fas fa-question-circle me-1"></i>What If (Lvl ${res.level + 1}):</h6>
                        <div class="row row-cols-3 g-2" style="justify-content: center;">${whatIfItemsHtml}</div>
                        <div class="text-center mt-2 small text-light">${keyInfoHtml}</div>
                        <div class="text-center mt-2 small text-light">${keyInfoHtml2}</div>
                    </div>`;
            }
            
            entryDiv.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-2"><h6 class="mb-0 text-warning"><i class="fas fa-treasure-chest me-1"></i>${title} #${historyIndex}</h6><small class="text-light">Seed: ${res.usedSeed}</small></div><hr class="my-2"><div class="row row-cols-3 g-2" style="justify-content: center;">${itemsHtml}</div>${chestXpDisplay}${whatIfHtml}<hr class="my-2"><small class="text-success"><i class="fas fa-arrow-right me-1"></i>Next Seed: ${res.nextSeed}</small>`;
            resultsDiv.prepend(entryDiv);
        });
        toggleBtn.style.display = state.history.length > 1 ? 'inline-block' : 'none';
        toggleBtn.innerHTML = state.isHistoryVisible ? '<i class="fas fa-eye-slash me-1"></i>Hide History' : '<i class="fas fa-eye me-1"></i>Show History';

        if (cardId === 'pet') {
            updateAndDisplayEggCounters();
        }
    }

    // Search Functions
    function getAvailableItemsForChest(chestType, eventType = null) {
        const availableItems = new Set();
        const addItemsFromPool = (poolName, rarity, type) => {
            const pool = ITEM_POOLS[poolName] || [];
            pool.forEach(item => availableItems.add(JSON.stringify({ baseName: item, rarity, type })));
        };
        if (chestType.startsWith('adventure')) {
            ['Common', 'Rare', 'Epic', 'Legendary', 'Ultimate', 'Mythic'].forEach(rarity => addItemsFromPool(`${rarity}_${eventType}`, rarity, 'Equipment'));
        } else if (chestType === 'egg') {
            const rarity = eventType;
            addItemsFromPool(`${rarity}Pet`, rarity, 'Pet');
        } else {
            const config = LOOT_TABLES[chestType === 'event' ? 'event' : chestType];
            if (config) {
                config.table.forEach(entry => {
                    const { type, rarity } = entry.result; let poolName = rarity;
                    if (type === 'Pet Egg') poolName += 'Egg';
                    if (rarity === 'Ultimate' && eventType) poolName += `_${eventType}`;
                    addItemsFromPool(poolName, rarity, type);
                });
            }
        }
        return Array.from(availableItems).map(item => JSON.parse(item));
    }
    function getAllAvailableItems() {
        const allItems = new Set();
        Object.values(ITEM_POOLS).forEach(pool => pool.forEach(item => allItems.add(item)));
        return Array.from(allItems).map(item => ({ baseName: item, rarity: 'Unknown', type: 'Unknown' })).filter(x=>!x.baseName.toLowerCase().includes("pet_")||x.baseName.toLowerCase().includes("egg"))
    }
    function searchForItem(targetItem, cardId) {
        const state = cardStates[cardId];
        if (!state || state.initialSeed === null) return { found: false, attempts: 0, error: 'No seed set for this chest type' };
        const [chestType, eventType] = cardId.includes('_') ? cardId.split('_') : [cardId, null];
        let currentSeed = state.initialSeed;
        if (chestType.startsWith('adventure')) {
            const card = document.querySelector(`.card[data-card-id="${cardId}"]`);
            const level = parseInt(card.querySelector('.level-input').value, 10);
            const vaultPC=parseInt(0+document.querySelector('.vault-percentage-input').value, 10)
            if (isNaN(level) || level < 1 || level > 100) return { found: false, error: 'Please enter a valid level (1-100) for the search.' };
             if(vaultPC>35) return { found: false, error: 'Please enter a valid vault percentage (0-35) for the search.' };
            state.history.forEach(action => { currentSeed = simulateAdventureChestOpening(currentSeed, action.level, action.eventType, action.vaultPercentage).nextSeed; });
            for (let attempts = 1; attempts <= 10000; attempts++) {
                const result = simulateAdventureChestOpening(currentSeed, level, eventType, 0);
                if (result.items.some(item => item.baseName === targetItem)) return { found: true, attempts: attempts + state.history.length, seed: currentSeed };
                currentSeed = result.nextSeed;
            }
        } else if (chestType === 'egg') {
            const rarity = eventType;
            state.history.forEach(() => { currentSeed = simulateEggOpening(currentSeed, rarity).nextSeed; });
            for (let attempts = 1; attempts <= 10000; attempts++) {
                const result = simulateEggOpening(currentSeed, rarity);
                if (result.items.some(item => item.baseName === targetItem)) return { found: true, attempts: attempts + state.history.length, seed: currentSeed };
                currentSeed = result.nextSeed;
            }
        } else {
            const config = LOOT_TABLES[chestType === 'event' ? 'event' : chestType];
            if (!config) return { found: false, error: 'Invalid chest configuration' };
            state.history.forEach(() => { currentSeed = simulateChestOpening(currentSeed, config, eventType).nextSeed; });
            for (let attempts = 1; attempts <= 10000; attempts++) {
                const result = simulateChestOpening(currentSeed, config, eventType);
                if (result.items.some(item => item.baseName === targetItem)) return { found: true, attempts: attempts + state.history.length, seed: currentSeed };
                currentSeed = result.nextSeed;
            }
        }
        return { found: false, attempts: 10000, error: 'Item not found within attempt limit' };
    }
    function globalSearchForItem(targetItem) {
        const results = [];
        document.querySelectorAll('.card[data-card-id]').forEach(card => {
            const cardId = card.dataset.cardId;
            const result = searchForItem(targetItem, cardId);
            if (result.found) results.push({ chestType: cardId.replace(/_/g, ': '), attempts: result.attempts });
        });
        return results;
    }
    function selectItemForSearch(targetItem, rarity) { // Make sure rarity is accepted as an argument
        if (currentSearchMode === 'local') {
            performLocalSearch(targetItem);
        } else if (currentSearchMode === 'global') {
            performGlobalSearch(targetItem);
        } else if (currentSearchMode === 'smart') { // ADD THIS BLOCK
            performSmartSearch(targetItem, currentSearchCard);
        }
    }
    function performLocalSearch(targetItem) {
        const result = searchForItem(targetItem, currentSearchCard);
        let resultHtml = result.found ? `<div class="alert alert-success"><i class="fas fa-check-circle me-2"></i><strong>Item Found!</strong><br>Found <strong>${targetItem}</strong> in <strong>${result.attempts}</strong> openings.</div>` : `<div class="alert alert-danger"><i class="fas fa-times-circle me-2"></i><strong>Item Not Found</strong><br>Could not find <strong>${targetItem}</strong> within 10,000 attempts. ${result.error ? `<br><small>${result.error}</small>` : ''}</div>`;
        document.getElementById('searchResultsContent').innerHTML = resultHtml;
        document.getElementById('searchResults').style.display = 'block';
    }
    function performGlobalSearch(targetItem) {
        const results = globalSearchForItem(targetItem);
        let resultHtml;
        if (results.length > 0) {
            const resultsList = results.map(r => `<li class="list-group-item d-flex justify-content-between align-items-center bg-dark text-white"><span><strong>${r.chestType}</strong></span><span class="badge bg-primary rounded-pill">${r.attempts} chests</span></li>`).join('');
            resultHtml = `<div class="alert alert-success"><i class="fas fa-check-circle me-2"></i><strong>Global Search Results for ${targetItem}:</strong></div><ul class="list-group">${resultsList}</ul>`;
        } else {
            resultHtml = `<div class="alert alert-warning"><i class="fas fa-exclamation-triangle me-2"></i><strong>No Results Found</strong><br>Could not find <strong>${targetItem}</strong> in any chest type with current seeds.</div>`;
        }
        document.getElementById('searchResultsContent').innerHTML = resultHtml;
        document.getElementById('searchResults').style.display = 'block';
    }
    function openLocalSearch(cardId) {
        currentSearchMode = 'local'; currentSearchCard = cardId;
        const [chestType, eventType] = cardId.includes('_') ? cardId.split('_') : [cardId, null];
        const availableItems = getAvailableItemsForChest(chestType, eventType);
        document.getElementById('searchModalTitle').textContent = `Find Item in ${cardId.replace(/_/g, ' ')}`;
        populateItemGrid(availableItems);
        document.getElementById('searchResults').style.display = 'none'; document.getElementById('searchOverlay').style.display = 'flex';
    }
    function openGlobalSearch() {
        currentSearchMode = 'global'; currentSearchCard = null; const allItems = getAllAvailableItems();
        document.getElementById('searchModalTitle').textContent = 'Global Item Search';
        populateItemGrid(allItems);
        document.getElementById('searchResults').style.display = 'none'; document.getElementById('searchOverlay').style.display = 'flex';
    }
    function populateItemGrid(items) {
        const grid = document.getElementById('itemGrid'); const searchInput = document.getElementById('searchInput');
        const renderItems = (filteredItems) => {
            grid.innerHTML = '';
            filteredItems.forEach(item => {
                const itemDiv = document.createElement('div'); itemDiv.className = 'col-4 col-md-3 mb-2';
                itemDiv.innerHTML = `<div class="text-center"><img src="./src/${item.baseName}.png" alt="${item.baseName}" class="item-image pulse" onclick="selectItemForSearch('${item.baseName}')" style="width: 60px; height: 60px;"><div class="small mt-1">${item.baseName}</div></div>`;
                grid.appendChild(itemDiv);
            });
        };
        renderItems(items); searchInput.oninput = () => renderItems(items.filter(item => item.baseName.toLowerCase().includes(searchInput.value.toLowerCase())));
    }
    function closeSearchModal() {
        document.getElementById('searchOverlay').style.display = 'none'; currentSearchMode = null; currentSearchCard = null; document.getElementById('searchInput').value = '';
    }

        /**
     * Formats the sequence of levels into a user-friendly, readable string.
     * @param {number[]} path - An array of levels, e.g., [20, 20, 25]
     * @returns {string} A formatted HTML string describing the steps.
     */
    function formatPath(path) {
        if (!path || path.length === 0) return "No actions required.";
        
        const groupedPath = path.reduce((acc, level) => {
            if (acc.length > 0 && acc[acc.length - 1].level === level) {
                acc[acc.length - 1].count++;
            } else {
                acc.push({ level: level, count: 1 });
            }
            return acc;
        }, []);

        return groupedPath.map(step =>
            `Open <strong>${step.count}</strong> chest(s) at <strong>Level ${step.level}</strong>`
        ).join('<br> &rarr; ');
    }

/**
 * Finds all possible paths to a target item, optimized with pruning.
 * @returns {Array<{path: number[], cost: number}>} An array of all found solutions.
 */
function findAllPaths(startSeed, targetItem, eventType, cardId, maxLevel, vaultPercentage) {
    const MAX_DEPTH = 7;
    const solutions = [];
    const queue = [{ seed: startSeed, path: [], cost: 0 }];
    const visited = new Map([[startSeed, { length: 0, cost: 0 }]]);

    // ## NUOVA AGGIUNTA: Variabile per tracciare il costo migliore trovato finora. ##
    // Inizializzata a un valore infinito.
    let minCostFound = Infinity;

    while (queue.length > 0) {
        const { seed, path, cost } = queue.shift();

        // ## OTTIMIZZAZIONE (LA TUA IDEA): Se il costo del percorso attuale è già peggiore ##
        // ## della soluzione migliore che abbiamo, salta questo ramo della ricerca. ##
        if (cost >= minCostFound) {
            continue;
        }

        if (path.length >= MAX_DEPTH) {
            continue;
        }

        for (let level = 1; level <= maxLevel; level++) {
            const newPath = [...path, level];
            const result = simulateAdventureChestOpening(seed, level, eventType, vaultPercentage, cardId);
            
            const keysFound = result.items.filter(item => item.baseName.endsWith('KeyIcon')).length;
            const newCost = cost + (1 - keysFound);
            
            // Controlla se abbiamo trovato una soluzione.
            if (result.items.some(item => item.baseName === targetItem)) {
                solutions.push({ path: newPath, cost: newCost });
                // ## AGGIORNAMENTO: Se questa soluzione è la migliore finora, aggiorna il nostro riferimento. ##
                minCostFound = Math.min(minCostFound, newCost);
            }

            const nextSeed = result.nextSeed;
            const pathLength = newPath.length;
            const existingEntry = visited.get(nextSeed);

            if (!existingEntry || pathLength < existingEntry.length || (pathLength === existingEntry.length && newCost < existingEntry.cost)) {
                // Aggiungi alla coda solo se il nuovo costo non è già peggiore della soluzione migliore.
                // Questo è un secondo controllo che evita di aggiungere percorsi inutili alla coda.
                if (newCost < minCostFound) {
                    visited.set(nextSeed, { length: pathLength, cost: newCost });
                    queue.push({ seed: nextSeed, path: newPath, cost: newCost });
                }
            }
        }
    }
    return solutions;
}

   /**
 * Performs a Breadth-First Search to find the shortest sequence of chest openings to get a target item.
 * @param {number} startSeed - The seed to begin the search from.
 * @param {string} targetItem - The baseName of the item to find.
 * @param {string} eventType - The type of adventure event ('Zeus' or 'Pirate').
 * @param {string} cardId - The full card ID ('adventure_Zeus' or 'adventure_Pirate').
 * @param {number} maxLevel - The maximum level the user has reached, to limit the search. // MODIFIED
 * @returns {number[]|null} An array representing the optimal path of levels, or null if not found.
 */
function findOptimalPath(startSeed, targetItem, eventType, cardId, maxLevel) { // MODIFIED
    const MAX_DEPTH = 8;
    const queue = [{ seed: startSeed, path: [] }];
    const visited = new Map([[startSeed, 0]]);

    while (queue.length > 0) {
        const { seed, path } = queue.shift();

        if (path.length >= MAX_DEPTH) continue;

        // MODIFIED: Loop only up to the user's current level.
        for (let level = 1; level <= maxLevel; level++) {
            const result = simulateAdventureChestOpening(seed, level, eventType, 0, cardId);

            if (result.items.some(item => item.baseName === targetItem)) {
                return [...path, level];
            }

            const nextSeed = result.nextSeed;
            const newDepth = path.length + 1;

            if (!visited.has(nextSeed) || visited.get(nextSeed) > newDepth) {
                visited.set(nextSeed, newDepth);
                queue.push({ seed: nextSeed, path: [...path, level] });
            }
        }
    }
    return null;
}

   /**
 * Initiates an advanced search to find the shortest and cheapest paths to an item.
 * @param {string} targetItem - The baseName of the item to find.
 * @param {string} cardId - The ID of the card initiating the search.
 */
async function performSmartSearch(targetItem, cardId) {
    const spinner = document.getElementById('searchSpinner');
    const resultsContent = document.getElementById('searchResultsContent');
    const resultsContainer = document.getElementById('searchResults');

    resultsContent.innerHTML = '';
    spinner.style.display = 'block';
    document.getElementById('itemGrid').style.display = 'none';
    resultsContainer.style.display = 'block';

    await new Promise(resolve => setTimeout(resolve, 50));

    const state = cardStates[cardId];
    if (!state || state.initialSeed === null) {
        resultsContent.innerHTML = `<div class="alert alert-danger">Please set an initial seed first.</div>`;
        spinner.style.display = 'none';
        return;
    }

    const card = document.querySelector(`.card[data-card-id="${cardId}"]`);
    const userLevel = parseInt(card.querySelector('.level-input')?.value, 10);
    const vaultPercentage = parseInt(card.querySelector('.vault-percentage-input')?.value, 10) || 0;

    if (isNaN(userLevel) || userLevel < 1 || userLevel > 100) {
        resultsContent.innerHTML = `<div class="alert alert-danger">Please enter your current valid Level (1-100).</div>`;
        spinner.style.display = 'none';
        return;
    }
     if (isNaN(vaultPercentage) || vaultPercentage < 0 || vaultPercentage > 100) {
        resultsContent.innerHTML = `<div class="alert alert-danger">Please enter a valid Vault % (0-100).</div>`;
        spinner.style.display = 'none';
        return;
    }


    const [_, eventType] = cardId.split('_');
    let startSeed = state.initialSeed;
    state.history.forEach(action => {
        startSeed = simulateAdventureChestOpening(startSeed, action.level, action.eventType, action.vaultPercentage, action.type).nextSeed;
    });

    const allSolutions = findAllPaths(startSeed, targetItem, eventType, cardId, userLevel, vaultPercentage);

    if (allSolutions.length === 0) {
        const searchLimit = findAllPaths.toString().match(/MAX_DEPTH = (\d+)/)[1];
        resultsContent.innerHTML = `<div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle me-2"></i><strong>Path Not Found</strong><br>
            No path for <strong>${targetItem}</strong> could be found within ${searchLimit} openings up to Level ${userLevel}.
        </div>`;
    } else {
        const shortestSolution = allSolutions.reduce((a, b) => a.path.length <= b.path.length ? a : b);
        const cheapestSolution = allSolutions.reduce((a, b) => a.cost <= b.cost ? a : b);

        let html = '';
        const areSame = JSON.stringify(shortestSolution.path) === JSON.stringify(cheapestSolution.path);

        html += `<div class="alert alert-success">
                    <h5><i class="fas fa-shoe-prints me-2"></i>Percorso più Breve</h5>
                    Trovato in <strong>${shortestSolution.path.length}</strong> aperture.
                    (Costo netto: <strong>${shortestSolution.cost}</strong> forzieri)
                    <div class="mt-2 p-2 bg-dark rounded" style="color:red">${formatPath(shortestSolution.path)}</div>
                 </div>`;
        
        if (!areSame) {
            html += `<div class="alert alert-info">
                        <h5><i class="fas fa-coins me-2"></i>Percorso più Conveniente</h5>
                        Costo netto: <strong>${cheapestSolution.cost}</strong> forzieri.
                        (Richiede <strong>${cheapestSolution.path.length}</strong> aperture)
                        <div class="mt-2 p-2 bg-dark rounded" style="color:red">${formatPath(cheapestSolution.path)}</div>
                     </div>`;
        }
        resultsContent.innerHTML = html;
    }
    spinner.style.display = 'none';
}

    /**
     * Opens the item selection modal for the Smart Find feature.
     * @param {string} cardId - The ID of the card ('adventure_Zeus' or 'adventure_Pirate').
     */
    function openSmartFindModal(cardId) {
        currentSearchMode = 'smart';
        currentSearchCard = cardId;
        const [chestType, eventType] = cardId.split('_');

        const availableItems = getAvailableItemsForChest(chestType, eventType);
        document.getElementById('searchModalTitle').textContent = `Smart Find Item in ${eventType} Chest`;
        populateItemGrid(availableItems);
        document.getElementById('searchResults').style.display = 'none';
        document.getElementById('itemGrid').style.display = 'flex'; // Ensure grid is visible
        document.getElementById('searchOverlay').style.display = 'flex';
    }
    // START: Calculators Logic
    function calculatePetFood() {
        const targetAmount = parseInt(document.getElementById('petFoodAmount').value, 10);
        const resultsContent = document.getElementById('petFoodResultsContent');
        const resultsContainer = document.getElementById('petFoodResults');
        resultsContainer.style.display = 'block';
        
        if (isNaN(targetAmount) || targetAmount <= 0) {
            resultsContent.innerHTML = `<div class="alert alert-danger">Please enter a valid positive number.</div>`;
            return;
        }

        const state = cardStates['small'];
        if (!state || state.initialSeed === null) {
            resultsContent.innerHTML = `<div class="alert alert-danger">Please set a seed for the Small Box first.</div>`;
            return;
        }

        let currentSeed = state.initialSeed;
        state.history.forEach(action => {
            const result = simulateChestOpening(currentSeed, LOOT_TABLES.small);
            currentSeed = result.nextSeed;
        });
        
        let totalPetFood = 0;
        let boxesOpened = 0;
        const maxAttempts = 50000;
        
        while (totalPetFood < targetAmount && boxesOpened < maxAttempts) {
            const result = simulateChestOpening(currentSeed, LOOT_TABLES.small);
            boxesOpened++;
            result.items.forEach(item => {
                if (item.baseName === 'PetFood') {
                    totalPetFood += Number(item.itemRoll || 0);
                }
            });
            currentSeed = result.nextSeed;
        }

        resultsContent.innerHTML = boxesOpened >= maxAttempts
            ? `<div class="alert alert-warning">Could not reach the target within ${maxAttempts} boxes.</div>`
            : `<div class="alert alert-success">You need to open <strong>${boxesOpened}</strong> more Small Boxes to get at least <strong>${targetAmount}</strong> Pet Food. You will have exactly <strong>${totalPetFood}</strong> Pet Food in total.</div>`;
    }

    function calculateXP() {
        const targetAmount = parseInt(document.getElementById('xpAmount').value, 10);
        const resultsContent = document.getElementById('xpResultsContent');
        const resultsContainer = document.getElementById('xpResults');
        resultsContainer.style.display = 'block';

        if (isNaN(targetAmount) || targetAmount <= 0) {
            resultsContent.innerHTML = `<div class="alert alert-danger">Please enter a valid positive number.</div>`;
            return;
        }

        const state = cardStates[currentCalcCardId];
        if (!state || state.initialSeed === null) {
            resultsContent.innerHTML = `<div class="alert alert-danger">Please set a seed for this chest type first.</div>`;
            return;
        }
        
        let currentSeed = state.initialSeed;
        let currentXp = 0;
        state.history.forEach(action => {
            let result;
            if (action.type.startsWith('adventure')) result = simulateAdventureChestOpening(currentSeed, action.level, action.eventType, action.vaultPercentage,action.type);
            else if (action.type === 'egg') result = simulateEggOpening(currentSeed, action.rarity);
            else result = simulateChestOpening(currentSeed, LOOT_TABLES[action.type], action.eventType);
            
            result.items.forEach(item => {
                currentXp += getItemXp(item);
            });
            currentSeed = result.nextSeed;
        });

        let boxesOpened = 0;
        const maxAttempts = 50000;
        const [chestType, eventType] = currentCalcCardId.includes('_') ? currentCalcCardId.split('_') : [currentCalcCardId, null];

        while (currentXp < targetAmount && boxesOpened < maxAttempts) {
            let result;
            const lastAction = state.history.length > 0 ? state.history[state.history.length-1] : { type: chestType, eventType: eventType, rarity: 'Rare', level: 1, vaultPercentage: 0 };

            if (lastAction.type.startsWith('adventure')) result = simulateAdventureChestOpening(currentSeed, lastAction.level, lastAction.eventType, lastAction.vaultPercentage,lastAction.type);
            else if (lastAction.type === 'egg') result = simulateEggOpening(currentSeed, lastAction.rarity);
            else result = simulateChestOpening(currentSeed, LOOT_TABLES[lastAction.type], lastAction.eventType);

            boxesOpened++;
            result.items.forEach(item => {
                currentXp += getItemXp(item);
            });
            currentSeed = result.nextSeed;
        }
        
         resultsContent.innerHTML = boxesOpened >= maxAttempts
            ? `<div class="alert alert-warning">Could not reach the target within ${maxAttempts} boxes. Target might be too high.</div>`
            : `<div class="alert alert-success">You need to open <strong>${boxesOpened}</strong> more chests to reach at least <strong>${targetAmount}</strong> XP. You will have exactly <strong>${currentXp}</strong> XP.</div>`;
    }
    // END: Calculators Logic

    function updateAndDisplayEggCounters() {
        // Start with a copy of the user-defined global counts
        let eggCounts = { ...globalEggCounts }; 

        // Add eggs from the Pet Box history
        const state = cardStates['pet'];
        if (state && state.initialSeed !== null) {
            let currentSeed = state.initialSeed;
            state.history.forEach(() => {
                const result = simulateChestOpening(currentSeed, LOOT_TABLES.pet);
                result.items.forEach(item => {
                    if (item.name.startsWith('Pet Egg')) {
                        const rarity = item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1);
                        if (eggCounts.hasOwnProperty(rarity)) {
                            eggCounts[rarity]++;
                        }
                    }
                });
                currentSeed = result.nextSeed;
            });
        }

        // Perform the merging logic
        if (eggCounts.Common >= 6) {
            const newRares = Math.floor(eggCounts.Common / 6);
            eggCounts.Rare += newRares;
            eggCounts.Common %= 6;
        }
        if (eggCounts.Rare >= 6) {
            const newEpics = Math.floor(eggCounts.Rare / 6);
            eggCounts.Epic += newEpics;
            eggCounts.Rare %= 6;
        }
        if (eggCounts.Epic >= 10) {
            const newLegendaries = Math.floor(eggCounts.Epic / 10);
            eggCounts.Legendary += newLegendaries;
            eggCounts.Epic %= 10;
        }
        if (eggCounts.Legendary >= 5) {
            const newUltimates = Math.floor(eggCounts.Legendary / 5);
            eggCounts.Ultimate += newUltimates;
            eggCounts.Legendary %= 5;
        }

        // Update the display in the Pet Box card
        for (const rarity in eggCounts) {
            const countSpan = document.getElementById(`egg-count-${rarity.toLowerCase()}`);
            if (countSpan) {
                countSpan.textContent = eggCounts[rarity];
            }
        }
    }

    // Event Listeners

    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
        .item-xp-label {
            position: absolute;
            top: 2px;
            right: 2px;
            background: rgba(255, 193, 7, 0.9);
            color: black;
            padding: 1px 5px;
            border-radius: 5px;
            font-size: 10px;
            font-weight: bold;
            z-index: 1;
            line-height: 1.2;
        }
    `;
    document.head.appendChild(styleSheet);

    const petCardBody = document.querySelector('.card[data-card-id="pet"] .card-body');
    if (petCardBody) {
        const counterContainer = document.createElement('div');
        counterContainer.id = 'egg-counter-container';
        counterContainer.className = 'd-flex justify-content-around align-items-center mt-3 p-2 rounded';
        counterContainer.style.background = 'rgba(0,0,0,0.2)';
        
        const rarities = ['Common', 'Rare', 'Epic', 'Legendary', 'Ultimate'];
        counterContainer.innerHTML = rarities.map(rarity => `
            <div class="text-center text-white">
                <img src="./src/Pet_Egg_${rarity}.png" style="width: 30px; height: 30px;" alt="${rarity} Egg" title="${rarity} Egg">
                <span id="egg-count-${rarity.toLowerCase()}" class="d-block fw-bold" style="font-size: 0.9em;">0</span>
            </div>
        `).join('');
        
        const buttonsDiv = petCardBody.querySelector('.d-flex.flex-wrap.gap-2.mb-3');
        buttonsDiv?.insertAdjacentElement('afterend', counterContainer);
    }

    loadState();

    // Populate global egg inputs from loaded state and render cards
    for (const rarity in globalEggCounts) {
        const input = document.getElementById(`global-egg-${rarity.toLowerCase()}`);
        if (input) {
            input.value = globalEggCounts[rarity] || '';
        }
    }
    document.querySelectorAll('.card[data-card-id^="adventure_"]').forEach(card => {
        const cardId = card.dataset.cardId;
        const state = cardStates[cardId];
        if (state) {
            const { levelInput, vaultInput } = getCardElements(card);
            if (levelInput && state.level) levelInput.value = state.level;
            if (vaultInput && state.vaultPercentage) vaultInput.value = state.vaultPercentage;
        }
    });
    document.querySelectorAll('.card[data-card-id]').forEach(card => renderCard(card.dataset.cardId));
    
    // Add event listeners for the new global egg inputs
    document.getElementById('global-egg-counter-container').addEventListener('input', (event) => {
        const input = event.target;
        if (input.tagName === 'INPUT' && input.type === 'number') {
            const rarity = input.id.split('-')[2].charAt(0).toUpperCase() + input.id.split('-')[2].slice(1);
            globalEggCounts[rarity] = parseInt(input.value, 10) || 0;
            saveState();
            updateAndDisplayEggCounters(); // Re-calculate and display immediately
        }
    });

    document.querySelectorAll('.seed-input').forEach(input => {
        input.addEventListener('keyup', (event) => {
            const card = event.target.closest('.card'); if (!card) return;
            const cardId = card.dataset.cardId; const seedValue = parseInt(event.target.value, 10);
            if (!isNaN(seedValue)) { if (!cardStates[cardId]) cardStates[cardId] = { initialSeed: seedValue, history: [] }; else cardStates[cardId].initialSeed = seedValue; saveState(); }
        });
    });
    
    document.querySelectorAll('.card[data-card-id^="adventure_"]').forEach(card => {
        const { cardId, levelInput, vaultInput } = getCardElements(card);
        const saveAdventureState = () => {
            if (!cardStates[cardId]) cardStates[cardId] = { initialSeed: null, history: [] };
            if (levelInput) cardStates[cardId].level = levelInput.value;
            if (vaultInput) cardStates[cardId].vaultPercentage = vaultInput.value;
            saveState();
            renderCard(cardId); 
        };
        levelInput?.addEventListener('keyup', saveAdventureState);
        vaultInput?.addEventListener('keyup', saveAdventureState);
    });

    const vaultInputs = document.querySelectorAll('.vault-percentage-input');
    vaultInputs.forEach(input => { input.addEventListener('input', (e) => { vaultInputs.forEach(otherInput => { if (otherInput !== e.target) otherInput.value = e.target.value; }); }); });

    document.getElementById('mainGrid').addEventListener('click', (event) => {
        const button = event.target.closest('button'); if (!button) return;
        const card = button.closest('.card'); if (!card) return;
        const { cardId, seedInput, levelInput, vaultInput } = getCardElements(card);
        const action = button.dataset.action;

        if (action === 'clear') {
            delete cardStates[cardId];
            saveState();
            renderCard(cardId);
            return;
        }
        if (action === 'toggle-history') { if (cardStates[cardId]) { cardStates[cardId].isHistoryVisible = !cardStates[cardId].isHistoryVisible; saveState(); renderCard(cardId); } return; }
        if (action === 'toggle-what-if') { 
            if (cardStates[cardId]) { 
                cardStates[cardId].isWhatIfVisible = !cardStates[cardId].isWhatIfVisible; 
                saveState(); 
                renderCard(cardId); 
            } 
            return; 
        }
        if (action === 'local-search') { openLocalSearch(cardId); return; }
        if (action === 'pet-food-calculator') {
             document.getElementById('petFoodModal').style.display = 'flex';
              document.getElementById('petFoodResults').style.display = 'none';
               document.getElementById('petFoodAmount').value = ''; return; }
        if (action === 'xp-calculator') {
            currentCalcCardId = cardId; const title = card.querySelector('h5').textContent.trim();
            document.getElementById('xpModalTitle').innerHTML = `<i class="fas fa-star me-2 text-warning"></i>XP Calc: ${title}`;
            document.getElementById('xpModal').style.display = 'flex'; document.getElementById('xpResults').style.display = 'none'; document.getElementById('xpAmount').value = ''; return;
        }
        if (action === 'simulate') {
            let state = cardStates[cardId]; let seedFromInput = parseInt(seedInput.value, 10);
            if ((!state || state.initialSeed === null) && isNaN(seedFromInput)) { toastr["error"]("Please enter an initial Seed first!", "Error"); return; }
            if (!state) { state = { initialSeed: seedFromInput, history: [], isHistoryVisible: true, isWhatIfVisible: false }; cardStates[cardId] = state; }
             if (state.initialSeed === null) {state.initialSeed = seedFromInput; }
            const { chestType, eventType, rarity } = button.dataset;
            let level = null, vaultPercentage = 0;
            if (chestType.startsWith('adventure')) {
                level = parseInt(levelInput.value, 10);
                if (isNaN(level) || level < 1 || level > 100) { toastr["error"]("Please enter a valid Level (1-100).", "Error"); return; }
                
                vaultPercentage = parseInt(vaultInput.value, 10) || 0;
                if(vaultPercentage>35) { toastr["error"]("Please enter a valid vault percentage (0-35) for the search.", "Error"); return; }
            }
            state.history.push({ type: chestType, eventType, rarity, level, vaultPercentage }); saveState(); renderCard(cardId);
        }
         if (action === 'smart-find') {
        openSmartFindModal(cardId);
        return;
    }
    });

    const clickImages = ["./src/PerfectParticle.png", "./src/DoubleParticleEN.png", "./src/DivineParticleEN.png", "./src/GreedyParticleEn.png", "./src/GoldenParticleEn.png", "./src/AnotherParticleEN.png"];
    document.body.addEventListener("click", function (e) {
      const imgSrc = clickImages[Math.floor(Math.random() * clickImages.length)];
      const img = document.createElement("img");
      img.src = imgSrc;
      img.classList.add("click-effect");
      img.style.left = `${e.pageX - 25}px`;
      img.style.top = `${e.pageY - 30}px`;
      const angle = (Math.random() * 20 - 10).toFixed(2);
      img.style.setProperty("--rand-rot", `${angle}deg`);
      document.body.appendChild(img);
      img.addEventListener("animationend", () => img.remove());
    });

   document.getElementById('toggleTutorial').addEventListener('click', function() {
        var tutorialCard = document.getElementById('tutorialCard');
        if (tutorialCard.style.display === 'none') { tutorialCard.style.display = 'block'; this.textContent = 'Hide Tutorial'; } 
        else { tutorialCard.style.display = 'none'; this.textContent = 'Show Tutorial'; }
    });
    document.getElementById('calculatePetFoodBtn').addEventListener('click', calculatePetFood);
    document.getElementById('calculateXpBtn').addEventListener('click', calculateXP);
    
    // ================== FIX FOR SCOPE ERRORS ==================
    // This makes the functions available globally so onclick attributes in the HTML can find them.
    window.selectItemForSearch = selectItemForSearch;
    window.openGlobalSearch = openGlobalSearch;
    window.closeSearchModal = closeSearchModal;
    // ==========================================================

}); // End of DOMContentLoaded