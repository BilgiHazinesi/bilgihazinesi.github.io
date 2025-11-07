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

/* --- GENEL SÜRÜKLE-BIRAK Fonksiyonları (Bölüm 1.2, 1.4, 1.6) --- */

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    draggedItem = ev.target;
    setTimeout(() => {
        if (draggedItem) draggedItem.classList.add("dragging");
    }, 0);
}

function allowDrop(ev) {
    ev.preventDefault();
    // Tüm geçerli bırakma alanları
    const validDropTargets = ".drop-zone, .fill-blank, #fill-word-bank, .food-items-container, .pyramid-level, #pyramid-labels-source";
    if (ev.target.matches(validDropTargets) || ev.target.closest(validDropTargets)) {
         var target = ev.target.matches(validDropTargets) ? ev.target : ev.target.closest(validDropTargets);
         target.classList.add("drag-over");
    }
}

function dragLeave(ev) {
    const validDropTargets = ".drop-zone, .fill-blank, #fill-word-bank, .food-items-container, .pyramid-level, #pyramid-labels-source";
    if (ev.target.matches(validDropTargets)) {
        ev.target.classList.remove("drag-over");
    }
}

function drop(ev) {
    ev.preventDefault();
    
    if (!draggedItem) return;

    // Bırakma hedefini bul
    const validDropTargets = ".drop-zone, .fill-blank, #fill-word-bank, .food-items-container, .pyramid-level, #pyramid-labels-source";
    var target = ev.target.matches(validDropTargets) ? ev.target : ev.target.closest(validDropTargets);
    
    if (!target) return; // Geçerli bir hedef değilse bırak
    
    target.classList.remove("drag-over");

    // Eğer bir .fill-blank (boşluk) veya .pyramid-level içine bırakılıyorsa
    if (target.classList.contains("fill-blank") || target.classList.contains("pyramid-level")) {
        // Eğer alanda zaten bir öğe varsa, onu kaynak havuzuna geri gönder
        if (target.children.length > 0 && target.firstElementChild !== draggedItem) {
            var child = target.firstElementChild;
            var sourceId = child.classList.contains('fill-word') ? 'fill-word-bank' : 'pyramid-labels-source';
            document.getElementById(sourceId).appendChild(child);
        }
        // Yeni öğeyi alana ekle
        target.appendChild(draggedItem);
    }
    // Eğer bir ana kaynak havuzuna (.drop-zone, kelime bankaları) bırakılıyorsa
    else if (target.matches(".drop-zone, #fill-word-bank, .food-items-container, #pyramid-labels-source")) {
        target.appendChild(draggedItem);
    }
    
    draggedItem.classList.remove("dragging");
    draggedItem.classList.add("dropped-item"); // (1.2 için)
    draggedItem = null;
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
    var allBlanks = document.querySelectorAll(".fill-blank");
    
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
        label.classList.add("incorrect");
        label.classList.remove("correct");
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
/* --- YENİ BÖLÜM 1.8: Bulmaca JS --- */

// Bulmaca cevaplarını ve hücrelerini tanımla
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

// Harf yazıldığında otomatik sonraki kutuya geç
function bulmacaAutoTab(event) {
    const target = event.target;
    
    // Sadece harf girildiğinde çalış (Backspace, Tab, vb. hariç)
    if (target.value.length === 1 && event.key.length === 1 && event.key.match(/[a-zçğıöşüA-ZÇĞİÖŞÜ]/i)) {
        // Türkçe karakterleri de büyük harfe çevir
        target.value = target.value.toLocaleUpperCase('tr-TR');
        
        const inputs = Array.from(document.querySelectorAll('#bulmaca-gridi .bulmaca-input'));
        const currentIndex = inputs.indexOf(target);
        
        // Son input değilse bir sonrakine odaklan
        if (currentIndex < inputs.length - 1) {
            // Bir sonraki 'input' olan hücreye atla
            for (let i = currentIndex + 1; i < inputs.length; i++) {
                if (inputs[i].tagName === 'INPUT') {
                    inputs[i].focus();
                    break;
                }
            }
        }
    }
}

// Backspace (Silme) tuşuna basıldığında bir öncekine geç
function bulmacaBackspace(event) {
    if (event.key === 'Backspace') {
        const target = event.target;
        if (target.value === '') { // Kutu zaten boşsa bir öncekine git
            const inputs = Array.from(document.querySelectorAll('#bulmaca-gridi .bulmaca-input'));
            const currentIndex = inputs.indexOf(target);
            
            if (currentIndex > 0) {
                // Bir önceki 'input' olan hücreye atla
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

// Bulmaca cevaplarını kontrol et
function checkBulmacaAnswers() {
    let allWordsCorrect = true;
    
    // Önce tüm stilleri temizle
    document.querySelectorAll('.bulmaca-input').forEach(input => {
        input.classList.remove('correct', 'incorrect');
    });

    // Kelimeleri tek tek kontrol et
    for (const num in wordData) {
        const word = wordData[num];
        let userAnswer = "";
        let cells = [];

        // Kelimeyi oluşturan hücrelerden harfleri al
        word.cells.forEach(cellId => {
            const cell = document.getElementById(cellId);
            if (cell) {
                userAnswer += cell.value.toLocaleUpperCase('tr-TR');
                cells.push(cell);
            }
        });

        // Cevabı kontrol et
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
/* --- YENİ BÖLÜM 1.9: Kazanım Testi JS --- */

// Testte bir şık seçildiğinde
function selectQuizOption(selectedOption) {
    // Bu sorunun kapsayıcısını bul
    var container = selectedOption.closest('.mcq-question-container');
    
    // Bu soruya ait tüm seçeneklerdeki 'selected' sınıfını kaldır
    container.querySelectorAll('.mcq-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Sadece tıklanan seçeneğe 'selected' sınıfını ekle
    selectedOption.classList.add('selected');
}

// Testi Bitir butonuna basıldığında
function submitQuiz() {
    let score = 0;
    const questions = document.querySelectorAll('#quiz-container .mcq-question-container');
    const totalQuestions = questions.length;

    questions.forEach((question, index) => {
        const correctAnswer = question.dataset.answer; // Doğru cevap (A, B, C, D)
        const selectedOption = question.querySelector('.mcq-option.selected');
        const feedbackEl = question.querySelector('.mcq-feedback');

        // Önceki geri bildirimleri temizle
        question.querySelectorAll('.mcq-option').forEach(opt => {
            opt.classList.remove('feedback-correct', 'feedback-incorrect');
        });
        
        if (selectedOption) {
            const userAnswer = selectedOption.textContent.charAt(0); // Cevabın harfi (A, B, C, D)
            
            if (userAnswer === correctAnswer) {
                // CEVAP DOĞRU
                score++;
                selectedOption.classList.add('feedback-correct');
                feedbackEl.textContent = "Doğru!";
                feedbackEl.className = "mcq-feedback feedback-correct";
            } else {
                // CEVAP YANLIŞ
                selectedOption.classList.add('feedback-incorrect');
                feedbackEl.textContent = "Yanlış! Doğru cevap: " + correctAnswer;
                feedbackEl.className = "mcq-feedback feedback-incorrect";
                
                // Doğru cevabı da bulup yeşil yap
                question.querySelectorAll('.mcq-option').forEach(opt => {
                    if (opt.textContent.charAt(0) === correctAnswer) {
                        opt.classList.add('feedback-correct');
                    }
                });
            }
        } else {
            // CEVAP BOŞ BIRAKILDI
            feedbackEl.textContent = "Boş Bırakıldı! Doğru cevap: " + correctAnswer;
            feedbackEl.className = "mcq-feedback feedback-incorrect";
            
            // Doğru cevabı bulup yeşil yap
            question.querySelectorAll('.mcq-option').forEach(opt => {
                if (opt.textContent.charAt(0) === correctAnswer) {
                    opt.classList.add('feedback-correct');
                }
            });
        }
    });

    // Final Sonucunu Göster
    const resultsContainer = document.getElementById('quiz-results');
    resultsContainer.textContent = `Test Sonucu: ${totalQuestions} soruda ${score} doğru yaptın!`;
    resultsContainer.style.display = "block";

    // Testi Bitir butonunu gizle ve sayfanın en altına kaydır
    document.getElementById('quiz-submit-button').style.display = 'none';
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
