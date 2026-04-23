import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// !!! PASTE YOUR FIREBASE CONFIG HERE !!!
const firebaseConfig = {
  apiKey: "AIzaSyBQ_kL9pXlQ1XESJ-ix7u6p5RJDBMgPXZk",
  authDomain: "bambi-diary.firebaseapp.com",
  projectId: "bambi-diary",
  storageBucket: "bambi-diary.firebasestorage.app",
  messagingSenderId: "1075036663948",
  appId: "1:1075036663948:web:b0d4e38b85315adaf04ba9",
  measurementId: "G-XG9QFY4R1S"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- APP SETTINGS & PASSWORDS ---
const PASSWORDS = {
    "Dimitar": "dimitar123", // Change these!
    "Verce": "verce123"
};

let currentUser = "";
let currentWeek = 0;
let thisWeekPrompts = [];

// --- THE PROMPT CATEGORIES ---
const cat1 = [
    "What do you want to tell me about this week that you haven't had the chance to yet?",
    "What did you learn this week that actually interested you?",
    "What was your biggest, clumsiest, or funniest 'oops' moment this week?",
    "What did you cook or treat yourself to this week? (Include a photo!)",
    "Put a photo of yourself from a moment you felt really good or happy this week.",
    "Tell me a random, weird fun fact you learned recently.",
    "Tell me the best joke you heard or thought of this week.",
    "What are you most proud of accomplishing this week, no matter how small?",
    "Did you meet someone new or have a memorable interaction with a stranger?",
    "Honestly, how was work/uni this week? Vent if you need to!",
    "What is one specific goal you want to crush next week?",
    "If this week had a theme song or a movie title, what would it be?",
    "If you could teleport to me right now, what's the first thing we'd do?",
    "Share a photo of a funny meme or text conversation from this week.",
    "What is one tiny, everyday thing that you were incredibly grateful for this week?",
    "Did you try anything new this week (a new route, a new hobby, a new drink)?",
    "Who was the Most Valuable Person in your life this week and why?",
    "Share a photo of an outfit you felt cute or confident in this week!",
    "What is the weirdest dream you had recently?",
    "What was the best movie, song, podcast, or TikTok you consumed this week?",
    "Rate this week from 1-10. What would have made it a perfect 10?",
    "If you could redo one conversation from this week, what would you say differently?",
    "Show me a photo of a cool view, a cute dog, or an interesting place you saw this week."
];

const cat2 = [
    "Next week snap a photo of something red/blue/green.",
    "Next week snap a photo of a dog/cat/animal.",
    "Next week snap a photo of a car/sign/building.",
    "If this week was a number, what would it be?",
    "If this week was a food, what would it be?",
    "If this week was an animal, what would it be?",
    "If this week was a color, what would it be?",
    "If this week was a drink, what would it be?"
];

const cat3 = [
    "If someone handed you €100 today to spend only on yourself, what would you buy?",
    "What is a random thought that kept you awake at night?",
    "If you could add one '0' to anything in your life right now, what would it be?",
    "If we were together this weekend, what lazy Sunday activity would we be doing?",
    "Did you use any of your hidden talents this week?"
];

// Calculate Week Number
function calculateCurrentWeek() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    return Math.ceil(days / 7);
}

// --- LOGIN LOGIC ---
document.getElementById('login-btn').addEventListener('click', () => {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-password').value;
    
    if (PASSWORDS[user] === pass) {
        currentUser = user;
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        document.getElementById('display-name').innerText = currentUser;
        initializeAppState();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
});

// --- LOAD APP DATA & BUILD FORM ---
async function initializeAppState() {
    currentWeek = calculateCurrentWeek();
    thisWeekPrompts = [...cat1]; // ALL of cat1
    thisWeekPrompts.push(cat2[currentWeek % cat2.length]); // 1 of cat2
    thisWeekPrompts.push(cat3[currentWeek % cat3.length]); // 1 of cat3

    try {
        const snapshot = await getDocs(collection(db, "diary_entries"));
        const allEntries = [];
        snapshot.forEach(doc => allEntries.push(doc.data()));

        let dimitarScore = 0;
        let verceScore = 0;
        let hasAnsweredThisWeek = false;

        allEntries.forEach(entry => {
            if (entry.author === "Dimitar") dimitarScore += (entry.pointsEarned || 0);
            if (entry.author === "Verce") verceScore += (entry.pointsEarned || 0);
            
            if (entry.author === currentUser && entry.week === currentWeek && entry.year === new Date().getFullYear()) {
                hasAnsweredThisWeek = true;
            }
        });

        document.getElementById('score-dimitar').innerText = dimitarScore;
        document.getElementById('score-verce').innerText = verceScore;

        if (hasAnsweredThisWeek) {
            document.getElementById('form-container').classList.add('hidden');
            document.getElementById('locked-state').classList.remove('hidden');
            return; // Stop building form if locked
        }

        // Fetch custom questions from partner
        const customQSnapshot = await getDocs(collection(db, "custom_questions"));
        customQSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.targetWeek === currentWeek) {
                thisWeekPrompts.push(`Custom from partner: ${data.question}`);
            }
        });

        // Build the dynamic form
        const container = document.getElementById('dynamic-questions-container');
        container.innerHTML = ""; // Clear
        
        thisWeekPrompts.forEach((q, index) => {
            const block = document.createElement('div');
            block.className = "bg-white p-4 rounded-xl shadow-sm border border-gray-100";
            block.innerHTML = `
                <label class="block text-sm font-bold text-gray-700 mb-2">${index + 1}. ${q}</label>
                <textarea id="answer-${index}" rows="2" class="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg mb-2 outline-none focus:ring-2 focus:ring-rose-300 text-sm" placeholder="Your answer..."></textarea>
                <input type="file" id="photo-${index}" accept="image/*" class="w-full text-xs text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-rose-50 file:text-rose-700 cursor-pointer">
            `;
            container.appendChild(block);
        });

    } catch (e) {
        console.error("Error loading app data:", e);
    }
}

// --- SUBMIT LOGIC ---
document.getElementById('submit-btn').addEventListener('click', async () => {
    const submitBtn = document.getElementById('submit-btn');
    const statusMsg = document.getElementById('status-msg');
    
    submitBtn.disabled = true;
    submitBtn.innerText = "Processing Answers... ⏳";
    statusMsg.classList.remove('hidden');

    let points = 0;
    let finalAnswers = [];
    
    // Check all generated fields
    for (let i = 0; i < thisWeekPrompts.length; i++) {
        const textVal = document.getElementById(`answer-${i}`).value.trim();
        const photoFile = document.getElementById(`photo-${i}`).files[0];

        if (textVal || photoFile) {
            points++; // Earn 1 point per answered question!
            let finalImageUrl = "";

            if (photoFile) {
                statusMsg.innerText = `Uploading image for question ${i + 1}... 📷`;
                // !!! PASTE YOUR IMGBB KEY HERE !!!
                const imgbbKey = "bb6fef33f027559137eb894374627451"; 
                const formData = new FormData();
                formData.append("image", photoFile);

                try {
                    const imgResponse = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, { method: "POST", body: formData });
                    const imgData = await imgResponse.json();
                    if (imgData.success) finalImageUrl = imgData.data.url;
                } catch (e) { console.error("ImgBB upload failed", e); }
            }

            finalAnswers.push({
                question: thisWeekPrompts[i],
                answer: textVal,
                imageUrl: finalImageUrl
            });
        }
    }

    if (points === 0) {
        alert("You must answer at least ONE question to lock the memory!");
        submitBtn.disabled = false;
        submitBtn.innerText = "Lock Memory & Get Points! 🔒";
        statusMsg.classList.add('hidden');
        return;
    }

    statusMsg.innerText = "Saving to database... ☁️";
    const now = new Date();
    const customQ = document.getElementById('custom-question').value.trim();

    try {
        await addDoc(collection(db, "diary_entries"), {
            author: currentUser,
            answers: finalAnswers, // Saves array of Q&As
            pointsEarned: points, // Saves total points for the week
            week: currentWeek,
            month: now.getMonth(), 
            year: now.getFullYear(),
            timestamp: now.getTime()
        });

        if (customQ) {
            await addDoc(collection(db, "custom_questions"), {
                author: currentUser,
                question: customQ,
                targetWeek: currentWeek + 1,
                timestamp: now.getTime()
            });
        }

        // Update UI
        document.getElementById('form-container').classList.add('hidden');
        document.getElementById('locked-state').classList.remove('hidden');
        document.getElementById('points-earned-msg').innerText = points;
        
        const scoreEl = document.getElementById(`score-${currentUser.toLowerCase()}`);
        scoreEl.innerText = parseInt(scoreEl.innerText) + points;

    } catch (error) {
        console.error("Error:", error);
        statusMsg.innerText = "Error saving memory.";
        submitBtn.disabled = false;
        submitBtn.innerText = "Lock Memory & Get Points! 🔒";
    }
});

// --- TIME CAPSULE LOGIC ---
document.getElementById('view-btn').addEventListener('click', async () => {
    const selectedMonth = parseInt(document.getElementById('month-select').value);
    const selectedYear = parseInt(document.getElementById('year-select').value);
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const entriesContainer = document.getElementById('entries-container');

    const isPastYear = selectedYear < currentYear;
    const isPastMonthSameYear = (selectedYear === currentYear && selectedMonth < currentMonth);

    // if (!isPastYear && !isPastMonthSameYear) {
    //     entriesContainer.innerHTML = `<div class="bg-red-50 p-4 rounded-xl border border-red-200"><p class="text-red-500 font-bold text-center">Nice try! These secrets are locked until the month is over. 🔒</p></div>`;
    //     return;
    // }

    entriesContainer.innerHTML = `<p class="text-center text-rose-400 font-medium animate-pulse">Dusting off the time capsule... ✨</p>`;

    try {
        const snapshot = await getDocs(collection(db, "diary_entries"));
        const entries = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.month === selectedMonth && data.year === selectedYear) {
                entries.push(data);
            }
        });

        entriesContainer.innerHTML = ""; 

        if (entries.length === 0) {
            entriesContainer.innerHTML = `<p class="text-center text-gray-400 italic">No memories found for this month.</p>`;
            return;
        }

        entries.sort((a, b) => a.timestamp - b.timestamp);

        entries.forEach(entry => {
            const dateStr = new Date(entry.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            const userColor = entry.author === "Dimitar" ? "bg-rose-400" : "bg-orange-400";
            
            const entryDiv = document.createElement('div');
            entryDiv.className = "bg-white p-5 rounded-2xl shadow-md border border-gray-200 mb-6 relative overflow-hidden";
            
            let htmlContent = `
                <div class="absolute top-0 left-0 w-1 h-full ${userColor}"></div>
                <div class="flex justify-between items-center mb-5 border-b pb-2">
                    <span class="font-extrabold text-gray-800 text-xl">${entry.author} <span class="text-sm font-normal text-gray-500">(${entry.pointsEarned} pts)</span></span>
                    <span class="text-xs font-semibold bg-gray-100 text-gray-500 py-1 px-2 rounded-full">${dateStr}</span>
                </div>
                <div class="space-y-6">
            `;
            
            // Loop through all answered questions for this entry
            if (entry.answers && entry.answers.length > 0) {
                entry.answers.forEach(ans => {
                    htmlContent += `
                        <div class="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <p class="text-xs font-bold text-rose-500 mb-2 uppercase tracking-wide">Q: ${ans.question}</p>
                            ${ans.answer ? `<p class="text-gray-700 text-sm whitespace-pre-wrap mb-3">${ans.answer}</p>` : ''}
                            ${ans.imageUrl ? `<img src="${ans.imageUrl}" class="w-full rounded-lg object-cover shadow-sm max-h-64 mt-2">` : ''}
                        </div>
                    `;
                });
            }

            htmlContent += `</div>`;
            entryDiv.innerHTML = htmlContent;
            entriesContainer.appendChild(entryDiv);
        });

    } catch (error) {
        console.error("Error fetching entries: ", error);
        entriesContainer.innerHTML = `<p class="text-red-500 text-center">Error unlocking the capsule.</p>`;
    }
});
