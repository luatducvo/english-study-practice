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

    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    function buildAnswerOptions(currentItem) {
        const correctMeaning = currentItem.meaning;
        const correctKey = normalizeStr(correctMeaning);
        const distractors = vocabData
            .map(item => item.meaning)
            .filter(meaning => normalizeStr(meaning) !== correctKey);
        const uniqueDistractors = [...new Map(distractors.map(meaning => [normalizeStr(meaning), meaning])).values()];

        return shuffleArray([
            correctMeaning,
            ...shuffleArray(uniqueDistractors).slice(0, 3)
        ]);
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
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
            const answerOptions = buildAnswerOptions(item);
            
            div.innerHTML = `
                <div class="word-text">${item.word}</div>
                <div class="answer-container">
                    <div class="question-text">Chon nghia dung</div>
                    <div class="answer-options" id="options-${index}">
                        ${answerOptions.map(option => `
                            <button class="answer-option" type="button" data-answer="${escapeHtml(option)}">
                                ${escapeHtml(option)}
                            </button>
                        `).join('')}
                    </div>
                    <ion-icon name="checkmark-circle" class="status-icon"></ion-icon>
                </div>
            `;
            wordListEl.appendChild(div);
            
            const optionButtons = div.querySelectorAll('.answer-option');

            if (isReviewChunk) {
                div.classList.add('correct');
                optionButtons.forEach(button => {
                    button.disabled = true;
                    if (normalizeStr(button.dataset.answer) === normalizeStr(item.meaning)) {
                        button.classList.add('selected', 'correct-answer');
                    }
                });
            } else {
                optionButtons.forEach(button => {
                    button.addEventListener('click', () => {
                        selectAnswer(button.dataset.answer, item.meaning, div, optionButtons);
                        checkAllCompleted();
                        setTimeout(focusNextQuestion, 50);
                    });
                });
            }

            function focusNextQuestion() {
                const nextAvailable = [...document.querySelectorAll('.word-item:not(.correct):not(.skipped) .answer-option:not(:disabled)')][0];

                if (nextAvailable) {
                    nextAvailable.focus();
                } else if (!nextBtn.disabled) {
                    nextBtn.focus();
                }
            }

            optionButtons.forEach(button => {
                button.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        button.click();
                        setTimeout(focusNextQuestion, 50);
                    }
                });
            });
        });

        if (isReviewChunk) {
            nextBtn.disabled = false;
        }
        
        updateProgress();
        setTimeout(() => {
            const firstOption = document.querySelector('.answer-option:not(:disabled)');
            if (firstOption) firstOption.focus();
        }, 100);
    }
    
    function selectAnswer(selectedMeaning, correctMeaning, itemDiv, optionButtons) {
        const isCorrect = normalizeStr(selectedMeaning) === normalizeStr(correctMeaning);

        optionButtons.forEach(button => {
            button.disabled = true;
            if (normalizeStr(button.dataset.answer) === normalizeStr(correctMeaning)) {
                button.classList.add('correct-answer');
            }
        });

        const selectedButton = [...optionButtons].find(button => normalizeStr(button.dataset.answer) === normalizeStr(selectedMeaning));
        if (selectedButton) {
            selectedButton.classList.add('selected');
        }

        if (isCorrect) {
            itemDiv.classList.add('correct');
            itemDiv.classList.remove('skipped');
        } else {
            itemDiv.classList.add('skipped');
            if (selectedButton) {
                selectedButton.classList.add('wrong-answer');
            }
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
                const correctMeaning = vocabData[currentIndex + index].meaning;
                item.querySelectorAll('.answer-option').forEach(button => {
                    button.disabled = true;
                    if (normalizeStr(button.dataset.answer) === normalizeStr(correctMeaning)) {
                        button.classList.add('selected', 'correct-answer');
                    }
                });
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
