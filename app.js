document.addEventListener('DOMContentLoaded', () => {
    // Check if data is loaded
    if (!window.vocabData || !window.vocabData.length) {
        document.getElementById('word-list').innerHTML = '<p style="color:var(--error-color)">Error: Vocabulary data not loaded.</p>';
        return;
    }

    let vocabData = [];
    const CHUNK_SIZE = 10;
    let currentIndex = 0;

    function initData() {
        vocabData = [...window.vocabData];
        // Fisher-Yates shuffle
        for (let i = vocabData.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [vocabData[i], vocabData[j]] = [vocabData[j], vocabData[i]];
        }
    }
    
    // UI Elements
    const wordListEl = document.getElementById('word-list');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const nextBtn = document.getElementById('next-btn');
    const skipBtn = document.getElementById('skip-btn');
    const mainContent = document.getElementById('main-content');
    const completionScreen = document.getElementById('completion-screen');
    const vocabTableBody = document.getElementById('vocab-table-body');
    const restartBtn = document.getElementById('restart-btn');
    
    // Normalize string for checking (remove accents, to lower)
    function normalizeStr(str) {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    }
    
    function updateProgress() {
        const wordsDone = Math.min(currentIndex, vocabData.length);
        const percent = (wordsDone / vocabData.length) * 100;
        progressBar.style.width = `${percent}%`;
        progressText.innerText = `${wordsDone} / ${vocabData.length} Words Completed`;
    }
    
    function renderChunk() {
        wordListEl.innerHTML = '';
        nextBtn.disabled = true;
        
        const chunk = vocabData.slice(currentIndex, currentIndex + CHUNK_SIZE);
        if (chunk.length === 0) {
            showCompletionScreen();
            return;
        }
        
        chunk.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'word-item';
            div.id = `word-item-${index}`;
            
            div.innerHTML = `
                <div class="word-text">${item.word}</div>
                <div class="input-container">
                    <input type="text" class="word-input" id="input-${index}" placeholder="Type Vietnamese meaning..." autocomplete="off">
                    <ion-icon name="checkmark-circle" class="status-icon"></ion-icon>
                </div>
            `;
            wordListEl.appendChild(div);
            
            const input = div.querySelector(`#input-${index}`);
            input.addEventListener('input', (e) => {
                checkAnswer(e.target.value, item.meaning, div, input, false);
                checkAllCompleted();
            });
            
            // Allow enter key to move to next input
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    checkAnswer(e.target.value, item.meaning, div, input, true);
                    checkAllCompleted();
                    
                    if (div.classList.contains('correct')) {
                        const nextInput = document.getElementById(`input-${index + 1}`);
                        if (nextInput) nextInput.focus();
                        else if (!nextBtn.disabled) nextBtn.click();
                    }
                }
            });
        });
        
        updateProgress();
        // Focus first input
        setTimeout(() => {
            const firstInput = document.getElementById('input-0');
            if (firstInput) firstInput.focus();
        }, 100);
    }
    
    function checkAnswer(userValue, correctMeaning, itemDiv, inputEl, isEnter) {
        const u = normalizeStr(userValue);
        const c = normalizeStr(correctMeaning);
        
        if (!u) return;

        let isCorrect = false;
        const parts = c.split(',').map(p => p.trim());
        
        // Auto-complete ONLY on exact match of the whole phrase or any comma-separated part
        if (u === c || parts.includes(u)) {
            isCorrect = true;
        } 
        // If user presses Enter, allow partial match (if user typed at least 3 chars of the meaning)
        else if (isEnter && u.length >= 3 && c.includes(u)) {
            isCorrect = true;
        }

        if (isCorrect) {
            itemDiv.classList.add('correct');
            itemDiv.classList.remove('skipped');
            inputEl.disabled = true;
            inputEl.value = correctMeaning; // Auto-fill with full meaning
        }
    }
    
    function checkAllCompleted() {
        const items = document.querySelectorAll('.word-item');
        let allCorrect = true;
        items.forEach(item => {
            if (!item.classList.contains('correct') && !item.classList.contains('skipped')) {
                allCorrect = false;
            }
        });
        
        if (allCorrect) {
            nextBtn.disabled = false;
        }
    }
    
    function showCompletionScreen() {
        mainContent.classList.add('hidden');
        completionScreen.classList.remove('hidden');
        
        // Render table
        vocabTableBody.innerHTML = '';
        vocabData.forEach((item, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td style="font-weight: 600;">${item.word}</td>
                <td>${item.meaning}</td>
            `;
            vocabTableBody.appendChild(tr);
        });
        
        // Fill progress to 100%
        progressBar.style.width = '100%';
        progressText.innerText = `${vocabData.length} / ${vocabData.length} Words Completed`;
    }
    
    // Event Listeners
    nextBtn.addEventListener('click', () => {
        currentIndex += CHUNK_SIZE;
        renderChunk();
    });
    
    skipBtn.addEventListener('click', () => {
        const items = document.querySelectorAll('.word-item');
        items.forEach((item, index) => {
            if (!item.classList.contains('correct')) {
                item.classList.add('skipped');
                const input = item.querySelector('.word-input');
                input.value = vocabData[currentIndex + index].meaning;
                input.disabled = true;
            }
        });
        nextBtn.disabled = false;
        nextBtn.focus();
    });
    
    restartBtn.addEventListener('click', () => {
        currentIndex = 0;
        initData();
        completionScreen.classList.add('hidden');
        mainContent.classList.remove('hidden');
        renderChunk();
    });
    
    // Start App
    initData();
    renderChunk();
});
