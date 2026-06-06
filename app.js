document.addEventListener('DOMContentLoaded', () => {
    // Check if data is loaded
    if (!window.vocabData || !window.vocabData.length) {
        document.getElementById('word-list').innerHTML = '<p style="color:var(--error-color)">Error: Vocabulary data not loaded.</p>';
        return;
    }

    let vocabData = [];
    const CHUNK_SIZE = 10;
    let currentIndex = 0;
    let completedChunks = new Set();

    function getCustomVocab() {
        const stored = localStorage.getItem('customVocab');
        return stored ? JSON.parse(stored) : [];
    }

    function saveCustomVocab(vocabArray) {
        localStorage.setItem('customVocab', JSON.stringify(vocabArray));
    }

    function initData() {
        const customVocab = getCustomVocab();
        vocabData = [...customVocab, ...window.vocabData];
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
    const backBtn = document.getElementById('back-btn');
    const nextBtn = document.getElementById('next-btn');
    const skipBtn = document.getElementById('skip-btn');
    const mainContent = document.getElementById('main-content');
    const completionScreen = document.getElementById('completion-screen');
    const vocabTableBody = document.getElementById('vocab-table-body');
    const completionBackBtn = document.getElementById('completion-back-btn');
    const restartBtn = document.getElementById('restart-btn');
    
    // Dashboard UI Elements
    const dashboardModal = document.getElementById('dashboard-modal');
    const openDashboardBtn = document.getElementById('open-dashboard-btn');
    const closeDashboardBtn = document.getElementById('close-dashboard-btn');
    const addWordForm = document.getElementById('add-word-form');
    const customWordsList = document.getElementById('custom-words-list');
    const customWordCount = document.getElementById('custom-word-count');
    
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
        backBtn.disabled = currentIndex === 0;
    }
    
    function renderChunk() {
        wordListEl.innerHTML = '';
        nextBtn.disabled = true;
        
        const chunk = vocabData.slice(currentIndex, currentIndex + CHUNK_SIZE);
        if (chunk.length === 0) {
            showCompletionScreen();
            return;
        }
        
        const isReviewChunk = completedChunks.has(currentIndex);

        chunk.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'word-item';
            div.id = `word-item-${index}`;
            
            div.innerHTML = `
                <div class="word-text">${item.word}</div>
                <div class="input-container">
                    <input type="text" class="word-input" id="input-${index}" placeholder="Type Vietnamese meaning..." autocomplete="off">
                    <button class="hint-btn" id="hint-${index}" title="Show Hint" tabindex="-1"><ion-icon name="bulb-outline"></ion-icon></button>
                    <ion-icon name="checkmark-circle" class="status-icon"></ion-icon>
                </div>
            `;
            wordListEl.appendChild(div);
            
            const input = div.querySelector(`#input-${index}`);
            const hintBtn = div.querySelector(`#hint-${index}`);

            if (isReviewChunk) {
                div.classList.add('correct');
                input.value = item.meaning;
                input.disabled = true;
                hintBtn.disabled = true;
            }
            
            let isHintVisible = false;
            hintBtn.addEventListener('click', () => {
                isHintVisible = !isHintVisible;
                if (isHintVisible) {
                    input.placeholder = item.meaning; // Show full meaning
                    hintBtn.classList.add('active');
                } else {
                    input.placeholder = "Type Vietnamese meaning...";
                    hintBtn.classList.remove('active');
                }
                input.focus();
            });

            function focusNextInput() {
                let found = false;
                // Find next available input after the current one
                for (let i = index + 1; i < CHUNK_SIZE; i++) {
                    const nextInput = document.getElementById(`input-${i}`);
                    if (nextInput && !nextInput.disabled) {
                        nextInput.focus();
                        found = true;
                        break;
                    }
                }
                
                // If not found, look from the beginning (wrap around)
                if (!found) {
                    for (let i = 0; i < index; i++) {
                        const prevInput = document.getElementById(`input-${i}`);
                        if (prevInput && !prevInput.disabled) {
                            prevInput.focus();
                            found = true;
                            break;
                        }
                    }
                }
                
                // If everything is done, focus the Next button
                if (!found && !nextBtn.disabled) {
                    nextBtn.focus();
                }
            }

            input.addEventListener('input', (e) => {
                checkAnswer(e.target.value, item.meaning, div, input, false);
                checkAllCompleted();
                if (div.classList.contains('correct')) {
                    // Delay focus to prevent IME/typing bleed to the next input
                    setTimeout(() => {
                        focusNextInput();
                    }, 300);
                }
            });
            
            // Allow enter key to move to next input
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent default Enter behavior (like form submission)
                    checkAnswer(e.target.value, item.meaning, div, input, true);
                    checkAllCompleted();
                    // Small delay to ensure any active composition or typing is cleared
                    setTimeout(() => {
                        focusNextInput();
                    }, 50);
                }
            });
        });

        if (isReviewChunk) {
            nextBtn.disabled = false;
        }
        
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
        completedChunks.add(currentIndex);
        currentIndex += CHUNK_SIZE;
        renderChunk();
    });

    function goBackChunk() {
        if (currentIndex >= vocabData.length) {
            const lastChunkStart = Math.max(0, Math.floor((vocabData.length - 1) / CHUNK_SIZE) * CHUNK_SIZE);
            currentIndex = lastChunkStart;
        } else {
            currentIndex = Math.max(0, currentIndex - CHUNK_SIZE);
        }
        completionScreen.classList.add('hidden');
        mainContent.classList.remove('hidden');
        renderChunk();
    }

    backBtn.addEventListener('click', () => {
        goBackChunk();
    });

    completionBackBtn.addEventListener('click', () => {
        goBackChunk();
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
        completedChunks = new Set();
        initData();
        completionScreen.classList.add('hidden');
        mainContent.classList.remove('hidden');
        renderChunk();
    });
    
    // Dashboard Event Listeners
    function renderCustomWords() {
        const customVocab = getCustomVocab();
        customWordsList.innerHTML = '';
        customWordCount.innerText = `(${customVocab.length})`;
        
        if (customVocab.length === 0) {
            customWordsList.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:20px;">No custom words yet.</p>';
            return;
        }
        
        customVocab.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'custom-word-item';
            div.innerHTML = `
                <div class="custom-word-text">${item.word}</div>
                <div class="custom-word-meaning">${item.meaning}</div>
                <button class="delete-word-btn" data-index="${index}" title="Delete Word"><ion-icon name="trash-outline"></ion-icon></button>
            `;
            customWordsList.appendChild(div);
        });
        
        // Add delete event listeners
        document.querySelectorAll('.delete-word-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.currentTarget.dataset.index;
                const currentList = getCustomVocab();
                currentList.splice(index, 1);
                saveCustomVocab(currentList);
                renderCustomWords();
            });
        });
    }

    openDashboardBtn.addEventListener('click', () => {
        renderCustomWords();
        dashboardModal.classList.remove('hidden');
    });

    closeDashboardBtn.addEventListener('click', () => {
        dashboardModal.classList.add('hidden');
    });
    
    // Close modal on outside click
    dashboardModal.addEventListener('click', (e) => {
        if (e.target === dashboardModal) {
            dashboardModal.classList.add('hidden');
        }
    });

    addWordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newWordInput = document.getElementById('new-word');
        const newMeaningInput = document.getElementById('new-meaning');
        
        const word = newWordInput.value.trim();
        const meaning = newMeaningInput.value.trim();
        
        if (word && meaning) {
            const customVocab = getCustomVocab();
            customVocab.unshift({ word, meaning }); // Add to top of list
            saveCustomVocab(customVocab);
            
            // Clear inputs
            newWordInput.value = '';
            newMeaningInput.value = '';
            newWordInput.focus();
            
            renderCustomWords();
        }
    });
    
    // Start App
    initData();
    renderChunk();
});
