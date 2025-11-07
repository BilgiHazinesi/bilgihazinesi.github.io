// Global değişkenler
var draggedItem = null;
var selectedMatchItem = null;

/* --- Sekmeli (Tab) Sistem JS --- */
function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tab-button");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

/* --- BÖLÜM 1.1: Tıklanabilir Kart JS --- */
function flipCard(cardElement) {
    cardElement.classList.toggle('is-flipped');
}

/* --- GENEL SÜRÜKLE-BIRAK Fonksiyonları (Bölüm 1.2, 1.4, 1.6, 2.2) --- */

function allowDrop(ev) {
    ev.preventDefault();
    const validDropTargets = ".drop-zone, .fill-blank, #fill-word-bank, .food-items-container, .pyramid-level, #pyramid-labels-source, #fill-word-bank-zararli";
    
    var target = ev.target.matches(validDropTargets) ? ev.target : ev.target.closest(validDropTargets);
    if (target) {
         target.classList.add("drag-over");
    }
}

function dragLeave(ev) {
    const validDropTargets = ".drop-zone, .fill-blank, #fill-word-bank, .food-items-container, .pyramid-level, #pyramid-labels-source, #fill-word-bank-zararli";
    
    var target = ev.target.matches(validDropTargets) ? ev.target : ev.target.closest(validDropTargets);
    if (target) {
        target.classList.remove("drag-over");
    }
}

function drop(ev) {
    ev.preventDefault();
    if (!draggedItem) return;

    const validDropTargets = ".drop-zone, .fill-blank, #fill-word-bank, .food-items-container, .pyramid-level, #pyramid-labels-source, #fill-word-bank-zararli";
    var target = ev.target.matches(validDropTargets) ? ev.target : ev.target.closest(validDropTargets);
    
    if (!target) return;
    
    target.classList.remove("drag-over");

    if (target.classList.contains("fill-blank") || target.classList.contains("pyramid-level")) {
        if (target.children.length > 0 && target.firstElementChild !== draggedItem) {
            var child = target.firstElementChild;
            var sourceId;
            
            if (child.classList.contains('fill-word')) {
                sourceId = 'fill-word-bank';
            } else if (child.classList.contains('pyramid-label')) {
                sourceId = 'pyramid-labels-source';
            } else if (child.classList.contains('fill-word-zararli')) {
                sourceId = 'fill-word-bank-zararli';
            } else {
                sourceId = 'food-items-source';
            }
            var sourceElement = document.getElementById(sourceId);
            if (sourceElement) {
                sourceElement.appendChild(child);
            }
        }
        target.appendChild(draggedItem);
    }
    else if (target.matches(".drop-zone, #fill-word-bank, .food-items-container, #pyramid-labels-source, #fill-word-bank-zararli")) {
        target.appendChild(draggedItem);
    }
    
    if(draggedItem) { 
         draggedItem.classList.remove("dragging");
         draggedItem.classList.add("dropped-item"); 
    }
    draggedItem = null;
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    draggedItem = ev.target;
    setTimeout(() => {
        if (draggedItem) draggedItem.classList.add("dragging");
    }, 0);
    
    ev.target.addEventListener('dragend', () => {
        if(draggedItem) { 
             draggedItem.classList.remove("dragging");
             draggedItem = null;
        }
    }, { once: true });
}

/* --- BÖLÜM 1.2: Sınıflandırma JS --- */
function checkDragDropAnswers() {
    var dropZones = document.querySelectorAll(".drop-zone");
    dropZones.forEach(zone => {
        var zoneType = zone.dataset.group;
        var itemsInZone = zone.querySelectorAll(".food-item");
        
        itemsInZone.forEach(item => {
            var itemType = item.dataset.group;
            if (itemType === zoneType) {
                item.classList.add("correct");
                item.classList.remove("incorrect");
            } else {
                item.classList.add("incorrect");
                item.classList.remove("correct");
            }
        });
    });
    
    var sourceZone = document.getElementById("food-items-source");
    var itemsInSource = sourceZone.querySelectorAll(".food-item");
    itemsInSource.forEach(item => {
        item.classList.add("incorrect");
        item.classList.remove("correct");
    });
}

/* --- BÖLÜM 1.3: Doğru-Yanlış JS --- */
function checkTrueFalse(buttonElement, selectedAnswer) {
    var questionItem = buttonElement.closest('.tf-question');
    var correctAnswer = questionItem.dataset.answer;
    var feedbackElement = questionItem.querySelector('.tf-feedback');
    
    if (questionItem.classList.contains('tf-answered')) {
        return;
    }
    questionItem.classList.add('tf-answered');

    if (selectedAnswer === correctAnswer) {
        buttonElement.classList.add('correct');
        feedbackElement.textContent = 'Doğru!';
        feedbackElement.className = 'tf-feedback feedback-correct';
    } else {
        buttonElement.classList.add('incorrect');
        feedbackElement.textContent = 'Yanlış!';
        feedbackElement.className = 'tf-feedback feedback-incorrect';
        
        var allButtons = questionItem.querySelectorAll('.tf-btn');
        allButtons.forEach(btn => {
            if (btn.textContent === correctAnswer) {
                btn.classList.add('correct');
            }
        });
    }
}

/* --- BÖLÜM 1.4: Boşluk Doldurma JS --- */
function checkFillBlanksAnswers() {
    var allBlanks = document.querySelectorAll(".fill-sentences .fill-blank"); // Sadece 1.4'tekileri seç
    
    allBlanks.forEach(blank => {
        var correctAnswer = blank.dataset.answer;
        var droppedWordElement = blank.querySelector(".fill-word");
        
        blank.classList.remove("incorrect");
        if (droppedWordElement) {
            droppedWordElement.classList.remove("correct", "incorrect");
        }

        if (droppedWordElement) {
            var droppedWord = droppedWordElement.dataset.word;
            
            var parentLi = blank.closest('li');
            if (parentLi && parentLi.dataset.answer1 && parentLi.dataset.answer2) {
                if (droppedWord === parentLi.dataset.answer1 || droppedWord === parentLi.dataset.answer2) {
                    droppedWordElement.classList.add("correct");
                } else {
                    droppedWordElement.classList.add("incorrect");
                }
            } else {
                if (droppedWord === correctAnswer) {
                    droppedWordElement.classList.add("correct");
                } else {
                    droppedWordElement.classList.add("incorrect");
                }
            }
        } else {
            blank.classList.add("incorrect");
        }
    });
    
    // Kaynak havuzunda kalanları yanlış işaretle
    var source = document.getElementById("fill-word-bank");
    source.querySelectorAll(".fill-word").forEach(word => {
        if (!word.closest('.fill-blank')) {
             word.classList.add("incorrect");
             word.classList.remove("correct");
        }
    });
}

/* --- BÖLÜM 1.5: Eşleştirme JS --- */
function selectMatchItem(item) {
    if (item.classList.contains('correct')) return;
    
    var allItems = document.querySelectorAll('.match-item');
    allItems.forEach(i => i.classList.remove('selected', 'incorrect'));
    
    item.classList.add('selected');
    selectedMatchItem = item;
}

function selectMatchTarget(target) {
    if (target.classList.contains('correct') || !selectedMatchItem) return;
    
    var correctAnswerId = selectedMatchItem.dataset.match;
    var targetId = target.id;
    
    document.querySelectorAll('.match-target').forEach(t => t.classList.remove('incorrect'));

    if (correctAnswerId === targetId) {
        selectedMatchItem.classList.add('correct');
        selectedMatchItem.classList.remove('selected');
        target.classList.add('correct');
        selectedMatchItem = null;
    } else {
        selectedMatchItem.classList.add('incorrect');
        target.classList.add('incorrect');
        
        setTimeout(() => {
            if (selectedMatchItem) selectedMatchItem.classList.remove('incorrect', 'selected');
            target.classList.remove('incorrect');
            selectedMatchItem = null;
        }, 1000);
    }
}

/* --- BÖLÜM 1.6: Piramit JS --- */
function checkPyramidAnswers() {
    var allLevels = document.querySelectorAll(".pyramid-level");
    
    allLevels.forEach(level => {
        var correctLevel = level.dataset.level;
        var droppedLabelElement = level.querySelector(".pyramid-label");
        
        level.classList.remove("incorrect");
        if (droppedLabelElement) {
            droppedLabelElement.classList.remove("correct", "incorrect");
        }

        if (droppedLabelElement) {
            var droppedLevel = droppedLabelElement.dataset.level;
            if (droppedLevel === correctLevel) {
                droppedLabelElement.classList.add("correct");
            } else {
                droppedLabelElement.classList.add("incorrect");
            }
        } else {
            level.classList.add("incorrect");
        }
    });
    
    var source = document.getElementById("pyramid-labels-source");
    source.querySelectorAll(".pyramid-label").forEach(label => {
        if (!label.closest('.pyramid-level')) {
            label.classList.add("incorrect");
            label.classList.remove("correct");
        }
    });
}

/* --- BÖLÜM 1.7: Bilinçli Tüketici JS --- */
function toggleChecklistItem(item) {
    item.classList.toggle('selected');
}

function checkChecklist() {
    var items = document.querySelectorAll("#shopping-checklist .check-item");
    var allCorrect = true;
    
    items.forEach(item => {
        var isRequired = item.dataset.required === 'true';
        var isSelected = item.classList.contains('selected');
        
        item.classList.remove('feedback-correct', 'feedback-incorrect');
        
        if (isRequired && isSelected) {
            item.classList.add('feedback-correct');
        } else if (isRequired && !isSelected) {
            item.classList.add('feedback-incorrect');
            allCorrect = false;
        } else if (!isRequired && isSelected) {
            item.classList.add('feedback-incorrect');
            allCorrect = false;
        }
    });
    
    if (allCorrect) {
        alert("Harika! Bilinçli bir tüketicinin tüm adımlarını biliyorsun!");
    }
}

function selectMCQOption(selectedOption, answerText) {
    var container = selectedOption.closest('.mcq-question-container');
    
    // Eğer bu quiz'in bir parçasıysa (Bölüm 1.9), bu fonksiyonu kullanma
    if (container.closest('#quiz-container')) {
        // Bölüm 1.9'un kendi selectQuizOption() fonksiyonu var.
        // Bu, Bölüm 1.7'deki tekil sorular içindir.
        var feedbackEl = container.querySelector('.mcq-feedback');
        var correctAnswer = feedbackEl.dataset.answer;
        
        container.querySelectorAll('.mcq-option').forEach(opt => {
            opt.classList.remove('selected', 'feedback-correct', 'feedback-incorrect');
        });
        
        selectedOption.classList.add('selected');

        if (answerText === correctAnswer) {
            selectedOption.classList.add('feedback-correct');
            feedbackEl.textContent = "Tebrikler, doğru!";
            feedbackEl.className = "mcq-feedback feedback-correct";
        } else {
            selectedOption.classList.add('feedback-incorrect');
            feedbackEl.textContent = "Yanlış cevap. Doğrusu 'B' şıkkı olacaktı.";
            feedbackEl.className = "mcq-feedback feedback-incorrect";
            
            container.querySelectorAll('.mcq-option').forEach(opt => {
                if (opt.textContent === correctAnswer) {
                    opt.classList.add('feedback-correct');
                }
            });
        }
    }
}

/* --- BÖLÜM 1.8: Bulmaca JS --- */
const wordData = {
    1: { answer: "MİNERAL", cells: ["c-1-2", "c-2-2", "c-3-2", "c-4-2", "c-5-2", "c-6-2", "c-7-2"] },
    2: { answer: "TSE", cells: ["c-8-8", "c-9-8", "c-10-8"] },
    3: { answer: "YAĞLAR", cells: ["c-4-1", "c-4-2", "c-4-3", "c-4-4", "c-4-5", "c-4-6"] },
    4: { answer: "BESİN", cells: ["c-6-4", "c-7-4", "c-8-4", "c-9-4", "c-10-4"] },
    5: { answer: "PROTEİN", cells: ["c-6-2", "c-6-3", "c-6-4", "c-6-5", "c-6-6", "c-6-7", "c-6-8"] },
    6: { answer: "KARBONHİDRAT", cells: ["c-2-1", "c-2-2", "c-2-3", "c-2-4", "c-2-5", "c-2-6", "c-2-7", "c-2-8", "c-2-9", "c-2-10", "c-2-11"] },
    7: { answer: "VİTAMİN", cells: ["c-8-4", "c-8-5", "c-8-6", "c-8-7", "c-8-8", "c-8-9", "c-8-10"] },
    8: { answer: "SU", cells: ["c-3-5", "c-4-5"] },
    9: { answer: "BAKTERİ", cells: ["c-10-4", "c-10-5", "c-10-6", "c-10-7", "c-10-8", "c-10-9", "c-10-10"] }
};

function bulmacaAutoTab(event) {
    const target = event.target;
    
    if (target.value.length === 1 && event.key.length === 1 && event.key.match(/[a-zçğıöşüA-ZÇĞİÖŞÜ]/i)) {
        target.value = target.value.toLocaleUpperCase('tr-TR');
        
        const inputs = Array.from(document.querySelectorAll('#bulmaca-gridi .bulmaca-input'));
        const currentIndex = inputs.indexOf(target);
        
        if (currentIndex < inputs.length - 1) {
            for (let i = currentIndex + 1; i < inputs.length; i++) {
                if (inputs[i].tagName === 'INPUT') {
                    inputs[i].focus();
                    break;
                }
            }
        }
    }
}

function bulmacaBackspace(event) {
    if (event.key === 'Backspace') {
        const target = event.target;
        if (target.value === '') { 
            const inputs = Array.from(document.querySelectorAll('#bulmaca-gridi .bulmaca-input'));
            const currentIndex = inputs.indexOf(target);
            
            if (currentIndex > 0) {
                for (let i = currentIndex - 1; i >= 0; i--) {
                    if (inputs[i].tagName === 'INPUT') {
                        inputs[i].focus();
                        break;
                    }
                }
            }
        }
    }
}

function checkBulmacaAnswers() {
    let allWordsCorrect = true;
    
    document.querySelectorAll('.bulmaca-input').forEach(input => {
        input.classList.remove('correct', 'incorrect');
    });

    for (const num in wordData) {
        const word = wordData[num];
        let userAnswer = "";
        let cells = [];

        word.cells.forEach(cellId => {
            const cell = document.getElementById(cellId);
            if (cell) {
                userAnswer += cell.value.toLocaleUpperCase('tr-TR');
                cells.push(cell);
            }
        });

        if (userAnswer === word.answer) {
            cells.forEach(cell => cell.classList.add('correct'));
        } else {
            cells.forEach(cell => cell.classList.add('incorrect'));
            allWordsCorrect = false;
        }
    }

    if (allWordsCorrect) {
        alert("Tebrikler! Bulmacayı tamamen doğru çözdünüz!");
    } else {
        alert("Bazı hatalar var. Kırmızı kutuları kontrol edin.");
    }
}

/* --- BÖLÜM 1.9: Kazanım Testi JS --- */

function selectQuizOption(selectedOption) {
    var container = selectedOption.closest('.mcq-question-container');
    
    // Sadece bu soruya ait seçenekleri temizle
    container.querySelectorAll('.mcq-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    selectedOption.classList.add('selected');
}

function submitQuiz() {
    let score = 0;
    const questions = document.querySelectorAll('#quiz-container .mcq-question-container');
    const totalQuestions = questions.length;

    questions.forEach((question, index) => {
        const correctAnswer = question.dataset.answer; // Doğru cevap (A, B, C, D)
        const selectedOption = question.querySelector('.mcq-option.selected');
        const feedbackEl = question.querySelector('.mcq-feedback');

        question.querySelectorAll('.mcq-option').forEach(opt => {
            opt.classList.remove('feedback-correct', 'feedback-incorrect');
        });
        
        if (selectedOption) {
            const userAnswer = selectedOption.textContent.charAt(0); // Cevabın harfi (A, B, C, D)
            
            if (userAnswer === correctAnswer) {
                score++;
                selectedOption.classList.add('feedback-correct');
                feedbackEl.textContent = "Doğru!";
                feedbackEl.className = "mcq-feedback feedback-correct";
            } else {
                selectedOption.classList.add('feedback-incorrect');
                feedbackEl.textContent = "Yanlış! Doğru cevap: " + correctAnswer;
                feedbackEl.className = "mcq-feedback feedback-incorrect";
                
                question.querySelectorAll('.mcq-option').forEach(opt => {
                    if (opt.textContent.charAt(0) === correctAnswer) {
                        opt.classList.add('feedback-correct');
                    }
                });
            }
        } else {
            feedbackEl.textContent = "Boş Bırakıldı! Doğru cevap: " + correctAnswer;
            feedbackEl.className = "mcq-feedback feedback-incorrect";
            
            question.querySelectorAll('.mcq-option').forEach(opt => {
                if (opt.textContent.charAt(0) === correctAnswer) {
                    opt.classList.add('feedback-correct');
                }
            });
        }
    });

    const resultsContainer = document.getElementById('quiz-results');
    resultsContainer.textContent = `Test Sonucu: ${totalQuestions} soruda ${score} doğru yaptın!`;
    resultsContainer.style.display = "block";

    document.getElementById('quiz-submit-button').style.display = 'none';
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* --- BÖLÜM 2.2: Boşluk Doldurma (Zararlı) JS --- */
function checkFillBlanksZararli() {
    var allBlanks = document.querySelectorAll("#zararli-fill-sentences .fill-blank");
    
    allBlanks.forEach(blank => {
        var correctAnswer = blank.dataset.answer;
        var droppedWordElement = blank.querySelector(".fill-word-zararli"); // Sadece bu bölümün kelimelerini ara
        
        blank.classList.remove("incorrect");
        if (droppedWordElement) {
            droppedWordElement.classList.remove("correct", "incorrect");
        }

        if (droppedWordElement) {
            var droppedWord = droppedWordElement.dataset.word;
            if (droppedWord === correctAnswer) {
                droppedWordElement.classList.add("correct");
            } else {
                droppedWordElement.classList.add("incorrect");
            }
        } else {
            blank.classList.add("incorrect");
        }
    });

    var source = document.getElementById("fill-word-bank-zararli");
    source.querySelectorAll(".fill-word-zararli").forEach(word => {
        if (!word.closest('.fill-blank')) { 
             word.classList.add("incorrect");
             word.classList.remove("correct");
        }
    });
}

/* --- BÖLÜM 2.3: Hastalık Tablosu JS --- */

function toggleDiseaseCell(cell) {
    if (cell.classList.contains('correct') || cell.classList.contains('incorrect') || cell.classList.contains('missing')) {
        return;
    }
    cell.classList.toggle('selected');
}

function checkDiseaseTable() {
    const rows = document.querySelectorAll("#disease-table tbody tr");

    rows.forEach(row => {
        const cells = row.querySelectorAll(".disease-cell");
        const sigaraCell = cells[0];
        const alkolCell = cells[1];
        
        const needsSigara = row.dataset.sigara === 'true';
        const needsAlkol = row.dataset.alkol === 'true';
        
        const selectedSigara = sigaraCell.classList.contains('selected');
        const selectedAlkol = alkolCell.classList.contains('selected');
        
        sigaraCell.classList.remove('correct', 'incorrect', 'missing', 'selected');
        alkolCell.classList.remove('correct', 'incorrect', 'missing', 'selected');

        // SİGARA hücresi
        if (needsSigara && selectedSigara) {
            sigaraCell.classList.add('correct'); 
        } else if (!needsSigara && selectedSigara) {
            sigaraCell.classList.add('incorrect');
        } else if (needsSigara && !selectedSigara) {
            sigaraCell.classList.add('missing');
        }
        
        // ALKOL hücresi
        if (needsAlkol && selectedAlkol) {
            alkolCell.classList.add('correct');
        } else if (!needsAlkol && selectedAlkol) {
            alkolCell.classList.add('incorrect');
        } else if (needsAlkol && !selectedAlkol) {
            alkolCell.classList.add('missing');
        }
    });
}
