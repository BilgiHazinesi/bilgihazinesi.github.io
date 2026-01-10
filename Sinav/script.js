// CONFIGURATION
const API_URL = "https://script.google.com/macros/s/AKfycb.../exec"; // PLACEHOLDER: USER MUST UPDATE AFTER DEPLOY
// MOCK API FLAG: Set to true for local testing without GAS deployment
const USE_MOCK_API = true;

// STATE
let currentUser = null;
let currentRole = null; // 'Öğrenci' or 'Öğretmen'
let currentData = null;
let activeTab = null;

// DOM ELEMENTS
const dom = {
    loader: document.getElementById('loader'),
    loginView: document.getElementById('login-view'),
    appContainer: document.getElementById('app-container'),
    loginForm: document.getElementById('login-form'),
    studentViews: document.getElementById('student-views'),
    teacherViews: document.getElementById('teacher-views'),
    studentNav: document.getElementById('student-nav'),
    teacherNav: document.getElementById('teacher-nav'),
    userAvatar: document.getElementById('user-avatar'),
    userName: document.getElementById('user-name'),
    userRole: document.getElementById('user-role'),
    examModal: document.getElementById('exam-modal'),
    examQuestions: document.getElementById('exam-questions-container'),
    closeExamBtn: document.getElementById('close-exam-btn'),
    submitExamBtn: document.getElementById('submit-exam-btn'),
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    setupNavigation();
    setupLogin();
});

// --- AUTHENTICATION ---

function checkSession() {
    const stored = localStorage.getItem('sinav_user');
    if (stored) {
        currentUser = JSON.parse(stored);
        initApp(currentUser);
    }
}

function setupLogin() {
    dom.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('login-code').value.trim();
        if (!code) return showToast('Lütfen kod giriniz', 'error');

        showLoader(true);
        try {
            const response = await apiCall('login', { code });
            if (response.status === 'success') {
                currentUser = response.data;
                localStorage.setItem('sinav_user', JSON.stringify(currentUser));
                initApp(currentUser);
            } else {
                showToast(response.message || 'Giriş başarısız', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Bağlantı hatası', 'error');
        } finally {
            showLoader(false);
        }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('sinav_user');
        location.reload();
    });
}

function initApp(user) {
    // Hide Login, Show App
    dom.loginView.classList.add('hidden');
    dom.appContainer.classList.remove('hidden');

    // Set Header
    dom.userName.textContent = user.name;
    dom.userRole.textContent = user.role;
    dom.userAvatar.textContent = user.name.split(' ').map(n => n[0]).join('').substring(0, 2);

    currentRole = user.role;

    if (currentRole === 'Öğrenci') {
        dom.studentViews.classList.remove('hidden');
        dom.studentNav.classList.remove('hidden');
        dom.teacherViews.classList.add('hidden');
        dom.teacherNav.classList.add('hidden');
        loadStudentDashboard();
        switchTab('student-exams-tab');
    } else {
        dom.teacherViews.classList.remove('hidden');
        dom.teacherNav.classList.remove('hidden');
        dom.studentViews.classList.add('hidden');
        dom.studentNav.classList.add('hidden');
        loadTeacherDashboard();
        switchTab('teacher-summary-tab');
    }
}

// --- NAVIGATION ---

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const targetId = item.getAttribute('data-target');
            switchTab(targetId);

            // Update UI
            navItems.forEach(n => {
                if (n.parentElement === item.parentElement) n.classList.remove('active', 'text-blue-600');
            });
            item.classList.add('active', 'text-blue-600');
        });
    });
}

function switchTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('[id$="-tab"]').forEach(el => el.classList.add('hidden'));
    // Show target
    document.getElementById(tabId).classList.remove('hidden');
    activeTab = tabId;
}

// --- STUDENT LOGIC ---

async function loadStudentDashboard() {
    showLoader(true);
    try {
        const res = await apiCall('getStudentData', { name: currentUser.name });
        if (res.status === 'success') {
            renderStudentExams(res.data.exams);
            renderStudentResults(res.data.results);
        }
    } catch (e) {
        showToast('Veri yüklenemedi', 'error');
    } finally {
        showLoader(false);
    }
}

function renderStudentExams(exams) {
    const container = document.getElementById('active-exams-list');
    container.innerHTML = '';
    
    if (exams.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 py-10">Aktif sınav bulunmamaktadır.</div>';
        return;
    }

    exams.forEach(exam => {
        const el = document.createElement('div');
        el.className = 'bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center exam-card cursor-pointer';
        el.innerHTML = `
            <div>
                <h4 class="font-bold text-gray-800">${exam.name}</h4>
                <p class="text-xs text-gray-500">${exam.date} • 120 dk</p>
            </div>
            <button class="bg-blue-100 text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-200">
                Başla
            </button>
        `;
        el.addEventListener('click', () => startExam(exam));
        container.appendChild(el);
    });
}

function renderStudentResults(results) {
    const container = document.getElementById('past-results-list');
    const chartCtx = document.getElementById('student-progress-chart').getContext('2d');

    container.innerHTML = '';

    // Chart Data
    const labels = results.map(r => r.examId);
    const scores = results.map(r => parseFloat(r.score));

    new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Başarı (%)',
                data: scores,
                borderColor: '#2563EB',
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    results.forEach(res => {
        const el = document.createElement('div');
        el.className = 'bg-white p-4 rounded-xl shadow-sm border border-gray-100';
        el.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-bold text-gray-800">${res.examId}</span>
                <span class="font-bold ${res.score >= 50 ? 'text-green-500' : 'text-red-500'}">%${res.score}</span>
            </div>
            <p class="text-xs text-gray-400">${res.date}</p>
        `;
        container.appendChild(el);
    });
}

// --- EXAM TAKING LOGIC ---
let currentExamSession = null;
let studentAnswers = {}; // { "Matematik": "AAAA..." }

function startExam(exam) {
    currentExamSession = exam;
    studentAnswers = {};

    dom.examModal.classList.remove('hidden');
    document.getElementById('exam-modal-title').textContent = exam.name;

    // Parse key structure to build UI (assuming key available or derived)
    // For now, if we don't have the key structure in 'exam', we assume a generic structure
    // But ideally backend sends "lessons" structure: ["Matematik:40", "Fen:20"]
    // Let's Mock structure if missing or parse from key if provided (security risk but requested in prompt logic)

    renderExamUI(exam);

    dom.closeExamBtn.onclick = () => {
        if(confirm("Sınavdan çıkmak istiyor musunuz? Kaydedilmeyecek.")) {
            dom.examModal.classList.add('hidden');
        }
    };

    dom.submitExamBtn.onclick = submitExam;
}

function renderExamUI(exam) {
    const container = dom.examQuestions;
    container.innerHTML = '';

    // Parse structure from key if available, otherwise default
    // Example Key: "Matematik:AAAAA;Fen:BBBBB"
    // If we rely on backend for security, we need 'structure' param.
    // Assuming we have exam.lessonKey for demo purposes (as per prompt request for full code)

    const lessons = [];
    if (exam.lessonKey) {
        exam.lessonKey.split(';').forEach(part => {
            const [name, key] = part.split(':');
            lessons.push({ name: name, count: key.length });
        });
    } else {
        // Fallback for demo
        lessons.push({ name: 'Genel', count: 20 });
    }

    lessons.forEach(lesson => {
        const section = document.createElement('div');
        section.className = 'mb-6';
        section.innerHTML = `<h3 class="font-bold text-lg mb-4 text-gray-800 border-b pb-2">${lesson.name}</h3>`;

        for (let i = 0; i < lesson.count; i++) {
            const qCard = document.createElement('div');
            qCard.className = 'question-card flex justify-between items-center';

            const qNum = document.createElement('span');
            qNum.className = 'font-bold text-gray-500 w-8';
            qNum.textContent = `${i + 1}.`;

            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'flex space-x-2';

            ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
                const bubble = document.createElement('div');
                bubble.className = 'bubble';
                bubble.textContent = opt;
                bubble.onclick = () => {
                    // Deselect siblings
                    optionsDiv.querySelectorAll('.bubble').forEach(b => b.classList.remove('selected'));
                    // Select this
                    bubble.classList.add('selected');
                    // Save answer
                    if (!studentAnswers[lesson.name]) studentAnswers[lesson.name] = Array(lesson.count).fill(" ");
                    studentAnswers[lesson.name][i] = opt;
                };
                optionsDiv.appendChild(bubble);
            });

            qCard.appendChild(qNum);
            qCard.appendChild(optionsDiv);
            section.appendChild(qCard);
        }

        container.appendChild(section);
    });
}

async function submitExam() {
    if (!confirm("Sınavı bitirmek istediğinize emin misiniz?")) return;
    
    // Construct raw string: "Matematik:ADC...;Fen:..."
    const rawParts = [];
    for (const [lesson, ansArr] of Object.entries(studentAnswers)) {
        rawParts.push(`${lesson}:${ansArr.join('')}`);
    }
    const rawString = rawParts.join(';');
    
    showLoader(true);
    try {
        const res = await apiCall('submitExam', {
            studentName: currentUser.name,
            examId: currentExamSession.id,
            answersRaw: rawString
        });
        
        if (res.status === 'success') {
            dom.examModal.classList.add('hidden');
            Swal.fire({
                title: 'Sınav Tamamlandı!',
                text: `Netiniz: ${res.data.net.toFixed(2)} | Puan: %${res.data.score.toFixed(2)}`,
                icon: 'success'
            });
            loadStudentDashboard(); // Refresh
        }
    } catch (e) {
        showToast('Gönderim hatası', 'error');
    } finally {
        showLoader(false);
    }
}

// --- TEACHER LOGIC ---

async function loadTeacherDashboard() {
    showLoader(true);
    try {
        const res = await apiCall('getTeacherData');
        if (res.status === 'success') {
            const data = res.data;
            document.getElementById('stat-total-students').textContent = data.students.length;
            document.getElementById('stat-active-exams').textContent = data.exams.filter(e => e.status === 'Aktif').length;
            
            // Populate Matrix Select
            const select = document.getElementById('analysis-exam-select');
            select.innerHTML = '<option>Tüm Sınavlar</option>';
            data.exams.forEach(e => {
                const opt = document.createElement('option');
                opt.value = e.id;
                opt.textContent = e.name;
                select.appendChild(opt);
            });

            renderTeacherManageList(data.exams);

            // Setup Analysis Listener
            const analysisSelect = document.getElementById('analysis-exam-select');
            analysisSelect.onchange = (e) => {
                if (e.target.value !== 'Tüm Sınavlar') {
                    renderAnalysis(e.target.value, data.results, data.exams);
                }
            };
        }
    } catch (e) {
        showToast('Veri yüklenemedi', 'error');
    } finally {
        showLoader(false);
    }
}

function renderAnalysis(examId, allResults, allExams) {
    const container = document.getElementById('matrix-container');
    const exam = allExams.find(e => e.id === examId);

    // Filter results for this exam
    const examResults = allResults.filter(r => r.examId === examId);

    if (!examResults.length) {
        container.innerHTML = '<div class="text-center text-gray-400 py-10">Bu sınava ait veri bulunamadı.</div>';
        return;
    }

    // Parse details: details string is JSON
    const parsedResults = examResults.map(r => {
        try {
            return { ...r, stats: JSON.parse(r.details) };
        } catch (e) { return null; }
    }).filter(r => r);

    // Get Structure from Exam Key (Mock or Real)
    // Assuming Exam Key format "Matematik:ABC...;Fen:..."
    // We need the key to know which question is which.
    // If exam.key is missing (mock), fallback.

    let keyMap = {};
    // Use lessonKey from mock if key is missing or use key directly
    const keySource = exam.key || exam.lessonKey;
    if (keySource) {
        keySource.split(';').forEach(part => {
            const [l, k] = part.split(':');
            if(l) keyMap[l] = k;
        });
    }

    // 1. Calculate Question Stats (Correct Percentage)
    const questionStats = []; // { id: "Mat-1", correctCount: 5, total: 10, pct: 50 }

    Object.keys(keyMap).forEach(lesson => {
        const keyStr = keyMap[lesson];
        for (let i = 0; i < keyStr.length; i++) {
            let correct = 0;
            parsedResults.forEach(student => {
                // student.stats.answers[lesson] is the string "AB C..."
                const ans = student.stats.answers && student.stats.answers[lesson] ? student.stats.answers[lesson][i] : ' ';
                if (ans === keyStr[i]) correct++;
            });

            questionStats.push({
                label: `${lesson.substring(0,3)} ${i+1}`,
                correct: correct,
                total: parsedResults.length,
                pct: Math.round((correct / parsedResults.length) * 100)
            });
        }
    });

    // Sort by difficulty (Low percentage = Hard)
    const hardest = [...questionStats].sort((a,b) => a.pct - b.pct).slice(0, 5);

    // HTML GENERATION
    let html = `
        <div class="mb-6">
            <h4 class="font-bold text-gray-700 mb-2 text-sm">🔥 En Zorlanan 5 Soru</h4>
            <div class="grid grid-cols-5 gap-2">
                ${hardest.map(q => `
                    <div class="bg-red-50 p-2 rounded text-center border border-red-100">
                        <div class="text-xs text-gray-500">${q.label}</div>
                        <div class="text-lg font-bold text-red-600">%${q.pct}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-xs text-left text-gray-500">
                <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                        <th class="px-2 py-2">Öğrenci</th>
                        <th class="px-2 py-2">Puan</th>
                        ${questionStats.map(q => `<th class="px-1 py-2 w-6 text-center text-[9px]">${q.label}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${parsedResults.map(student => {
                        // Build Answer Cells
                        let cells = '';
                        Object.keys(keyMap).forEach(lesson => {
                            const k = keyMap[lesson];
                            const sAns = (student.stats.answers && student.stats.answers[lesson]) || "";
                            for(let i=0; i<k.length; i++) {
                                const isCorrect = sAns[i] === k[i];
                                const isEmpty = !sAns[i] || sAns[i] === ' ';
                                const color = isCorrect ? 'bg-green-100 text-green-600' : (isEmpty ? 'bg-gray-100' : 'bg-red-100 text-red-600');
                                const val = sAns[i] || '-';
                                cells += `<td class="px-1 py-1 text-center border-b border-gray-50"><div class="w-5 h-5 flex items-center justify-center rounded-full ${color} mx-auto font-bold">${val}</div></td>`;
                            }
                        });
                        return `
                            <tr class="bg-white border-b hover:bg-gray-50">
                                <td class="px-2 py-2 font-medium text-gray-900 whitespace-nowrap">${student.student}</td>
                                <td class="px-2 py-2 font-bold text-blue-600">%${student.score}</td>
                                ${cells}
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

function renderTeacherManageList(exams) {
    const list = document.getElementById('exam-management-list');
    list.innerHTML = '';
    exams.forEach(exam => {
        const item = document.createElement('div');
        item.className = 'bg-white p-3 rounded-lg border border-gray-100 flex justify-between items-center';
        item.innerHTML = `
            <div class="text-sm">
                <span class="font-bold block">${exam.name}</span>
                <span class="text-gray-400 text-xs">${exam.id}</span>
            </div>
            <span class="px-2 py-1 rounded text-xs ${exam.status === 'Aktif' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}">
                ${exam.status}
            </span>
        `;
        list.appendChild(item);
    });
}

// Add Exam Form
document.getElementById('add-exam-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    showLoader(true);
    try {
        const res = await apiCall('saveExam', data);
        if (res.status === 'success') {
            showToast('Sınav eklendi', 'success');
            e.target.reset();
            loadTeacherDashboard();
        }
    } catch (err) {
        showToast('Hata oluştu', 'error');
    } finally {
        showLoader(false);
    }
});


// --- UTILS & MOCK API ---

function showLoader(show) {
    if (show) dom.loader.classList.remove('hidden');
    else dom.loader.classList.add('hidden');
}

function showToast(msg, type = 'info') {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
    Toast.fire({
        icon: type,
        title: msg
    });
}

// API WRAPPER
function apiCall(action, params = {}) {
    return new Promise((resolve, reject) => {
        const payload = { action, ...params };

        if (USE_MOCK_API) {
            console.log("MOCK API CALL:", payload);
            setTimeout(() => {
                resolve(mockBackend(action, params));
            }, 800);
            return;
        }

        // Real Fetch
        fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors', // GAS limitation usually
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => resolve(data))
        .catch(err => reject(err));
    });
}

// MOCK BACKEND FOR LOCAL TESTING
function mockBackend(action, params) {
    const mockDB = {
        users: [
            { id: "101", name: "Ali Yılmaz", role: "Öğrenci", code: "1234" },
            { id: "999", name: "Zeynal Hoca", role: "Öğretmen", code: "admin" }
        ],
        exams: [
            { id: "MAT1", name: "Matematik Deneme 1", key: "Matematik:ABCDE", date: "2026-01-01", status: "Aktif", lessonKey: "Matematik:ABCDE" }
        ],
        // Sample Results with raw answers for Analysis Testing
        results: [
            {
                date: "2026-01-01",
                student: "Ali Yılmaz",
                examId: "MAT1",
                score: "80.00",
                details: JSON.stringify({
                    answers: { "Matematik": "ABCDA" }, // Last one wrong (Key: ABCDE)
                    totalNet: 3.66
                })
            },
            {
                date: "2026-01-01",
                student: "Veli Demir",
                examId: "MAT1",
                score: "60.00",
                details: JSON.stringify({
                    answers: { "Matematik": "ABC  " }, // 2 empty
                    totalNet: 3.0
                })
            }
        ]
    };

    if (action === 'login') {
        const user = mockDB.users.find(u => u.code === params.code);
        return user ? { status: 'success', data: user } : { status: 'error', message: 'Kod hatalı' };
    }

    if (action === 'getStudentData') {
        return { status: 'success', data: { exams: mockDB.exams, results: mockDB.results } };
    }

    if (action === 'submitExam') {
        const net = 4.0; // Mock calculation
        const score = 80;
        return { status: 'success', data: { net, score } };
    }

    if (action === 'getTeacherData') {
        return { status: 'success', data: { exams: mockDB.exams, results: mockDB.results, students: mockDB.users } };
    }

    if (action === 'saveExam') {
        mockDB.exams.push({ id: params.id, name: params.name, status: "Aktif", lessonKey: params.key });
        return { status: 'success' };
    }

    return { status: 'error', message: 'Action not mocked' };
}
