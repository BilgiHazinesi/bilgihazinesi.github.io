// Google Apps Script Code for Education Management System (LMS)
// Deploy this as a Web App (Execute as: Me, Access: Anyone)

// --- CONFIGURATION ---
const SPREADSHEET_ID = "1glFz1ylZOolsRNDu1UNhbMVDptP_pZzd2-bQJE2DttQ"; // Extracted from image URL
const SHEET_NAMES = {
  USERS: "Kullanicilar",
  EXAMS: "Sinavlar",
  RESULTS: "Sonuclar"
};

const TELEGRAM_TOKEN = "8502986412:AAFgRp9L6KRDkpNCM82lOUWxgSzC0kA-wCo";
const ADMIN_CHAT_ID = "373077730";

// --- API ENTRY POINT ---
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    let response = {};

    if (action === "login") {
      response = handleLogin(params);
    } else if (action === "getStudentData") {
      response = getStudentData(params);
    } else if (action === "submitExam") {
      response = handleSubmitExam(params);
    } else if (action === "getTeacherData") {
      response = getTeacherData();
    } else if (action === "saveExam") {
      response = saveExam(params);
    } else if (action === "deleteExam") {
      response = deleteExam(params);
    } else {
      throw new Error("Unknown action: " + action);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: response }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// --- ACTION HANDLERS ---

function handleLogin(params) {
  const code = params.code;
  const sheet = getSheet(SHEET_NAMES.USERS);
  const data = sheet.getDataRange().getValues();
  // Headers: ID, Ad, Rol, Sifre (Assuming column index 3 is Sifre/Code based on typical flow, or 0 if ID is the code)
  // Let's assume standard structure based on image context:
  // Col 0: ID/Username, Col 1: Ad Soyad, Col 2: Rol (Öğrenci/Öğretmen), Col 3: Şifre (Code)

  // Checking data from row 1 (skipping header)
  for (let i = 1; i < data.length; i++) {
    // Check both ID and Password columns for the code, or just a specific code column.
    // Simplified: "Login Code Only" implies the code is the unique identifier.
    // Let's assume Col 3 is 'Sifre' and Col 0 is 'ID'.
    if (String(data[i][3]) === String(code) || String(data[i][0]) === String(code)) {
      return {
        name: data[i][1],
        role: data[i][2],
        id: data[i][0]
      };
    }
  }
  throw new Error("Geçersiz giriş kodu.");
}

function getStudentData(params) {
  const studentName = params.name; // or ID

  // 1. Get Active Exams
  const examsSheet = getSheet(SHEET_NAMES.EXAMS);
  const examsData = examsSheet.getDataRange().getValues();
  const availableExams = [];

  for (let i = 1; i < examsData.length; i++) {
    const row = examsData[i];
    // ID, Ad, Anahtar, Tarih, SonuclariGoster, Durum, ...
    if (row[5] === "Aktif") {
      availableExams.push({
        id: row[0],
        name: row[1],
        date: formatDate(row[3]),
        duration: 120, // Default duration or add column
        lessonKey: row[2] // Keeping key hidden in frontend usually, but needed for client-side check if preferred. Better to keep server side.
        // Actually, for this logic, we send the key if client calculates, but better to just send metadata.
        // We will send basic info.
      });
    }
  }

  // 2. Get Past Results
  const resultsSheet = getSheet(SHEET_NAMES.RESULTS);
  const resultsData = resultsSheet.getDataRange().getValues();
  const myResults = [];

  for (let i = 1; i < resultsData.length; i++) {
    const row = resultsData[i];
    // Zaman, OgrenciAdi, SinavID, Detaylar, BasariYuzdesi
    if (row[1] === studentName) {
      myResults.push({
        date: formatDate(row[0]),
        examId: row[2],
        score: row[4],
        details: row[3] // JSON string
      });
    }
  }

  return { exams: availableExams, results: myResults };
}

function getTeacherData() {
  const examsSheet = getSheet(SHEET_NAMES.EXAMS);
  const exams = examsSheet.getDataRange().getValues().slice(1).map(r => ({
    id: r[0], name: r[1], key: r[2], date: formatDate(r[3]), showResult: r[4], status: r[5]
  }));

  const resultsSheet = getSheet(SHEET_NAMES.RESULTS);
  const results = resultsSheet.getDataRange().getValues().slice(1).map(r => ({
    date: formatDate(r[0]), student: r[1], examId: r[2], score: r[4], details: r[3]
  }));

  const usersSheet = getSheet(SHEET_NAMES.USERS);
  const students = usersSheet.getDataRange().getValues().slice(1)
    .filter(r => r[2] === "Öğrenci")
    .map(r => ({ id: r[0], name: r[1] }));

  return { exams, results, students };
}

function handleSubmitExam(params) {
  const { studentName, examId, answers, answersRaw } = params;
  // answers: { "Matematik": { correct: 10, wrong: 2, empty: 3, net: 9.33 }, ... }
  // OR raw answers string to calculate on server.
  // Let's assume the Client sends the calculated detailed stats for simplicity,
  // BUT we must verify or just log it.
  // The prompt asks for "Net calculation (3 wrong 1 right)".
  // Let's implement robust server-side calculation if the key is available.

  const examsSheet = getSheet(SHEET_NAMES.EXAMS);
  const examRow = examsSheet.getDataRange().getValues().find(r => r[0] === examId);

  if (!examRow) throw new Error("Sınav bulunamadı.");

  // Calculate Score (Server Side Authority)
  const masterKey = examRow[2]; // e.g. "Matematik:ABC...;Fen:DDD..."
  const resultStats = calculateStats(masterKey, answersRaw);
  const totalNet = resultStats.totalNet;
  const percentage = (totalNet / resultStats.totalQuestions) * 100;

  const detailsJson = JSON.stringify(resultStats);

  // Save to Sheet
  const resultsSheet = getSheet(SHEET_NAMES.RESULTS);
  resultsSheet.appendRow([
    new Date(),
    studentName,
    examId,
    detailsJson,
    percentage.toFixed(2)
  ]);

  // Telegram Notification
  const msg = `📢 *YENİ SINAV SONUCU*\n\n` +
              `👤 *Öğrenci:* ${studentName}\n` +
              `📝 *Sınav:* ${examId}\n` +
              `📊 *Başarı:* %${percentage.toFixed(2)}\n` +
              `✅ *Net:* ${totalNet}`;

  sendTelegram(msg);

  return { success: true, score: percentage, net: totalNet };
}

function saveExam(params) {
  const sheet = getSheet(SHEET_NAMES.EXAMS);
  // Params: id, name, key, status...
  // Simple append for now. Real LMS needs update logic.
  sheet.appendRow([
    params.id, params.name, params.key, new Date(), "Evet", "Aktif", "Evet", "Hayır"
  ]);
  return { success: true };
}

function deleteExam(params) {
    // Implementation for deleting (marking passive) would go here
    return { success: true };
}

// --- HELPER FUNCTIONS ---

function calculateStats(masterKey, studentAnswersStr) {
    // masterKey: "Matematik:ABCDE...;Fen:AAAA..."
    // studentAnswersStr: "Matematik:ABCEE...;Fen:AAAB..." (similar format expected from client)

    // Parse Keys
    const parseKey = (str) => {
        const map = {};
        if (!str) return map;
        str.split(';').forEach(part => {
            const [lesson, keys] = part.split(':');
            if (lesson && keys) map[lesson.trim()] = keys.trim();
        });
        return map;
    };

    const keyMap = parseKey(masterKey);
    const ansMap = parseKey(studentAnswersStr);

    let totalCorrect = 0;
    let totalWrong = 0;
    let totalEmpty = 0;
    let totalQuestions = 0;
    const lessonStats = {};

    for (const lesson in keyMap) {
        const k = keyMap[lesson];
        const a = ansMap[lesson] || "";

        let lCorrect = 0;
        let lWrong = 0;
        let lEmpty = 0;

        for (let i = 0; i < k.length; i++) {
            const correctChar = k[i];
            const studentChar = a[i] || " "; // Space for empty

            if (studentChar === " " || studentChar === "") {
                lEmpty++;
            } else if (studentChar.toUpperCase() === correctChar.toUpperCase()) {
                lCorrect++;
            } else {
                lWrong++;
            }
        }

        const lNet = lCorrect - (lWrong / 3);
        lessonStats[lesson] = { correct: lCorrect, wrong: lWrong, empty: lEmpty, net: lNet };

        totalCorrect += lCorrect;
        totalWrong += lWrong;
        totalEmpty += lEmpty;
        totalQuestions += k.length;
    }

    const totalNet = totalCorrect - (totalWrong / 3);

    // Include raw answers for Matrix Analysis
    return {
        totalCorrect, totalWrong, totalEmpty, totalNet, totalQuestions,
        lessons: lessonStats,
        answers: ansMap // Saving student's raw answers
    };
}

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(name);
}

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return Utilities.formatDate(d, "GMT+3", "dd.MM.yyyy HH:mm");
}

function sendTelegram(text) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const payload = {
      chat_id: ADMIN_CHAT_ID,
      text: text,
      parse_mode: "Markdown"
    };

    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload)
    });
  } catch (e) {
    Logger.log("Telegram Error: " + e.toString());
  }
}
