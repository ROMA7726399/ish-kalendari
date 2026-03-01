// Personal Work & Salary Tracker - Vanilla JS
const el = id => document.getElementById(id);
const fmt = v => v.toLocaleString('uz-UZ', {style:'currency',currency:'UZS',maximumFractionDigits:0});

// ---------- Settings & Data ----------
function loadSettings(){
  const raw = localStorage.getItem('pws_settings');
  if(raw) return JSON.parse(raw);
  return { monthlySalary: 3000000, workingDays: 22, theme: 'light' }; // Standart qiymatlar
}

function saveSettings(s){
  localStorage.setItem('pws_settings', JSON.stringify(s));
}

function monthKey(y,m){
  return `pws_month_${y}_${String(m).padStart(2,'0')}`;
}

function loadMonthData(y,m){
  const raw = localStorage.getItem(monthKey(y,m));
  return raw ? JSON.parse(raw) : {};
}

function saveMonthData(y,m,data){
  localStorage.setItem(monthKey(y,m), JSON.stringify(data));
}

// ---------- App State ----------
const state = {
  today: new Date(),
  viewYear: null,
  viewMonth: null,
  selectedDay: null,
  settings: loadSettings(),
  monthData: {},
  // Yangi qo'shiladigan qismi:
  profile: {
    name: localStorage.getItem('pws_userName') || '+ yaratish',
    img: localStorage.getItem('pws_userImg') || 'https://via.placeholder.com/40'
  }
};

// ---------- Renderers ----------
function renderMonth(){
  const {viewYear, viewMonth, monthData} = state;
  const calendar = el('calendar');
  if(!calendar) return;
  calendar.innerHTML = '';

  const dows = ['Yak','Dush','Sesh','Chor','Pay','Jum','Shan'];
  dows.forEach(d=>{
    const h = document.createElement('div'); h.className='dow'; h.textContent=d; calendar.appendChild(h);
  });

  const first = new Date(viewYear, viewMonth-1, 1);
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const startDow = first.getDay();

  for(let i=0;i<startDow;i++){
    const c = document.createElement('div'); c.className='cell empty'; calendar.appendChild(c);
  }

  for(let d=1; d<=daysInMonth; d++){
    const c = document.createElement('div'); c.className='cell';
    c.dataset.day = d;
    if(state.selectedDay === d) c.classList.add('selected');

    const dateSpan = document.createElement('div'); dateSpan.className='date'; dateSpan.textContent = d;
    c.appendChild(dateSpan);

    const val = monthData[d];
    if(val === 1) c.classList.add('full');
    else if(val === 0.5) c.classList.add('half');
    else if(val === 0) c.classList.add('off');

    const small = document.createElement('small');
    const dailyEarning = calcDailyEarning(val);
    small.textContent = (val == null) ? "" : fmt(dailyEarning);
    c.appendChild(small);

    c.addEventListener('click', ()=> {
        state.selectedDay = d;
        document.querySelectorAll('.cell').forEach(cell => cell.classList.remove('selected'));
        c.classList.add('selected');
    });
    calendar.appendChild(c);
  }

  const label = new Date(viewYear, viewMonth-1, 1).toLocaleString('uz-UZ',{month:'long',year:'numeric'});
  el('monthLabelCenter').textContent = label;

  renderStats();
}

function renderStats() {
  const { settings, monthData } = state;
  let full = 0, half = 0, off = 0, totalEarned = 0;
  let totalWorkedMath = 0; 

  // 1. Hisob-kitob qismi
  for (const k in monthData) {
    const v = Number(monthData[k]);
    if (v === 1) {
      full++;
      totalWorkedMath += 1;
    } else if (v === 0.5) {
      half++;
      totalWorkedMath += 0.5;
    } else if (v === 0) {
      off++;
    }
    
    // safeDaily funksiyasi orqali hisoblash
    totalEarned += (v || 0) * safeDaily(settings);
  }

  // 2. Ma'lumotlarni ekranga chiqarish
  if (el('statOpshi')) el('statOpshi').textContent = totalWorkedMath;
  if (el('statFull')) el('statFull').textContent = full;
  if (el('statHalf')) el('statHalf').textContent = half;
  if (el('statOff')) el('statOff').textContent = off;
  if (el('statEarned')) el('statEarned').textContent = fmt(totalEarned);

  // 3. Progress Bar va Ustida yuruvchi Foiz (Indicator)
  const daysInMonth = new Date(state.viewYear, state.viewMonth, 0).getDate();
  const percent = Math.min(100, Math.round((totalWorkedMath / daysInMonth) * 100));
  
  const fill = el('progressFill');
  const indicator = el('progressIndicator'); // Ustida yuruvchi konteyner
  const percentTxt = el('progressPercent'); // Foiz yozuvi

  if (fill) {
    fill.style.width = percent + '%';
  }

  if (indicator) {
    // Ko'rsatkichni chiziq uchi bilan bir xil pozitsiyaga suramiz
    indicator.style.left = percent + '%';
  }

  if (percentTxt) {
    percentTxt.textContent = percent + '%';
  }
}

function safeDaily(settings) {
  // Oydagi jami kunlar sonini aniqlash (masalan: 28, 30 yoki 31)
  const daysInMonth = new Date(state.viewYear, state.viewMonth, 0).getDate();
  
  // Agar maosh kiritilmagan bo'lsa 0 qaytaradi
  const salary = Number(settings.monthlySalary || 0);
  
  // Kunlik stavka: Maosh / Oydagi kunlar soni
  return salary / daysInMonth;
}

function calcDailyEarning(v){
  if(v==null) return 0;
  return v * safeDaily(state.settings);
}

// ---------- Interactions ----------
function setSelectedValue(value){
  if(!state.selectedDay) return alert("Avval taqvimdan kunni tanlang!");
  state.monthData[state.selectedDay] = Number(value);
  saveMonthData(state.viewYear, state.viewMonth, state.monthData);
  renderMonth();
}

function formatNumberInput(value) {
    return value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function bindSettings() {
    const s = el('monthlySalary');
    if (state.settings.monthlySalary) {
        s.value = formatNumberInput(state.settings.monthlySalary.toString());
    }

    s.addEventListener('input', (e) => {
        let rawValue = e.target.value.replace(/\s/g, "");
        e.target.value = formatNumberInput(rawValue);
        state.settings.monthlySalary = Number(rawValue) || 0;
        saveSettings(state.settings);
        renderStats();
        renderMonth();
    });
}

function bindActions(){
  el('prevMonth2').addEventListener('click', () => {
    state.viewMonth--;
    if(state.viewMonth < 1){ state.viewMonth = 12; state.viewYear--; }
    state.selectedDay = null;
    state.monthData = loadMonthData(state.viewYear, state.viewMonth);
    renderMonth();
    renderCalendar();
  });

  el('nextMonth2').addEventListener('click', () => {
    state.viewMonth++;
    if(state.viewMonth > 12){ state.viewMonth = 1; state.viewYear++; }
    state.selectedDay = null;
    state.monthData = loadMonthData(state.viewYear, state.viewMonth);
    renderMonth();
    renderCalendar();
  });

  document.querySelectorAll('.action').forEach(b=>{
    b.addEventListener('click', () => setSelectedValue(b.dataset.value));
  });

    el('themeToggle').addEventListener('click', toggleTheme);

    // Statistika oynasini ochish (Topilgan pul qismiga bosilganda)
    const earnedStat = el('statEarned');
    if(earnedStat && earnedStat.parentElement) {
        earnedStat.parentElement.style.cursor = 'pointer';
        earnedStat.parentElement.addEventListener('click', showFullStatistics);
    }

    // Statistika oynasini yopish tugmasi (agar mavjud bo'lsa)
    const closeStatsBtn = el('closeStatsModal');
    if(closeStatsBtn) closeStatsBtn.addEventListener('click', closeStatsModal);
  }

// ... (kodning boshidagi state o'zgaruvchilari qolsin)

function applyTheme() {
    // Faqat html klassini o'zgartiramiz, tugma ichidagi div CSS orqali o'zi suriladi
    if (state.settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function toggleTheme() {
    state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
    saveSettings(state.settings);
    applyTheme();
}

function renderCalendar() {
    const label = document.getElementById('monthLabelCenter');
    
    // Tekshirish: Label bormi o'zi?
    if (!label) {
        console.error("DIQQAT: 'monthLabelCenter' ID-li element topilmadi! HTMLni tekshiring.");
        return;
    }

    // 1. Bugungi sana
    const now = new Date();
    console.log("Hozirgi vaqt:", now); // Console'da ko'rinadi

    // 2. State tekshiruvi
    console.log("State ma'lumotlari:", state.viewMonth, state.viewYear);

    const vMonth = state.viewMonth;
    const vYear = state.viewYear;

    const viewDate = new Date(vYear, vMonth - 1, 1);
    const monthName = viewDate.toLocaleString('uz-UZ', { month: 'long' });

    // 3. Shartli chiqarish
    if (vMonth === (now.getMonth() + 1) && vYear === now.getFullYear()) {
        label.innerText = `${now.getDate()}-${monthName}, ${vYear}`;
    } else {
        label.innerText = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)}, ${vYear}`;
    }
    
    // Grid chizish qismi pastda davom etadi...
}

function toggleTheme(){
  state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
  saveSettings(state.settings);
  applyTheme();
}

document.getElementById('imageInput').onchange = function(event) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const labelText = document.getElementById('labelText');

    if (file) {
        const reader = new FileReader();

        reader.onload = function(e) {
            console.log("Rasm muvaffaqiyatli o'qildi!"); // Tekshirish uchun
            imagePreview.src = e.target.result; // Rasmni rasmga yuklash
            previewContainer.style.display = "block"; // Konteynerni ko'rsatish
            labelText.textContent = file.name; // Fayl nomini yozish
        };

        reader.onerror = function() {
            console.error("Rasmni o'qishda xatolik yuz berdi!");
        };

        reader.readAsDataURL(file); // Faylni o'qishni boshlash
    }
};

// ---------- Full Statistics Logic ----------
function showFullStatistics() {
    const modal = el('statsModal');
    const list = el('statsList');
    
    if (!modal || !list) return; // Agar HTMLda elementlar bo'lmasa, to'xtatish

    list.innerHTML = ''; // Tozalash

    // Hamma kalitlarni olish (pws_month_ bilan boshlanadigan)
    let keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        let key = localStorage.key(i);
        if (key.startsWith('pws_month_')) {
            keys.push(key);
        }
    }

    // Yillar va oylar bo'yicha tartiblash (eng yangisi tepada)
    keys.sort().reverse();

    if (keys.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:20px; color:var(--muted);">Hozircha maʼlumot yoʻq.</p>';
    }

    keys.forEach(key => {
        const data = JSON.parse(localStorage.getItem(key));
        const [,, yearStr, monthStr] = key.split('_');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        
        // Hisob-kitoblar
        let totalWorked = 0;
        let totalOff = 0;
        
        Object.values(data).forEach(val => {
            const v = Number(val);
            if (v === 1) totalWorked += 1;
            else if (v === 0.5) totalWorked += 0.5;
            else if (v === 0) totalOff++;
        });

        // Agar osha oyda kamida bitta belgi bolsa
        if (Object.keys(data).length > 0) {
            const date = new Date(year, month - 1);
            const monthName = date.toLocaleString('uz-UZ', { month: 'long' });
            const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            
            // Maoshni hisoblash (Joriy sozlamalar va o'sha oydagi kunlar soniga qarab)
            const daysInMonth = new Date(year, month, 0).getDate();
            const daily = state.settings.monthlySalary / daysInMonth;
            const earned = totalWorked * daily;

            const item = document.createElement('div');
            item.className = 'stat-item';
            item.onclick = () => {
                state.viewYear = year;
                state.viewMonth = month;
                state.selectedDay = null; // Tanlangan kunni tozalash
                state.monthData = loadMonthData(year, month); // Yangi oy ma'lumotlarini yuklash
                renderMonth();
                renderCalendar();
                closeStatsModal();
            };

            item.innerHTML = `
                <div class="stat-row-top">
                    <span>${capitalizedMonth} ${year}-yil</span>
                    <span class="stat-salary">${fmt(earned)}</span>
                </div>
                <div class="stat-row-bottom">
                    <span>Ish: <strong>${totalWorked} kun</strong></span>
                    <span>Dam: <strong>${totalOff} kun</strong></span>
                </div>
            `;
            list.appendChild(item);
        }
    });

    modal.style.display = 'flex';
    modal.classList.remove('hidden');
}

function closeStatsModal() {
    const modal = el('statsModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

// Modal tashqarisiga bosganda yopilish
window.addEventListener('click', function(event) {
    const modal = el('statsModal');
    if (event.target === modal) {
        closeStatsModal();
    }
});


// ---------- Profile Logic ----------
function setupProfile() {
    const modal = el('profileModal');
    const trigger = el('profileTrigger');
    const saveBtn = el('saveProfile');
    const closeBtn = el('closeModal');
    const nameInp = el('nameInput');
    const imgInp = el('imageInput');

    // 1. SAHIFA YUKLANIShIDA MA'LUMOTLARNI QAYTARISh
    // LocalStorage dan ma'lumotlarni olamiz
    const savedName = localStorage.getItem('pws_userName');
    const savedImg = localStorage.getItem('userImg');

    // Agar ma'lumot bo'lsa, ularni ekranda ko'rsatamiz
    if (savedName) {
        el('userNameDisplay').textContent = savedName;
        nameInp.value = savedName; // Modal ichidagi inputga ham yozib qo'yamiz
    }
    if (savedImg) {
        el('userImg').src = savedImg;
    }

    // 2. MODALNI BOShQARISh
    trigger.onclick = () => {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    };

    const hideModal = () => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    };

    closeBtn.onclick = hideModal;

    // 3. MA'LUMOTLARNI SAQLASh
    saveBtn.onclick = () => {
        // Ismni saqlash
        if (nameInp.value.trim() !== "") {
            const newName = nameInp.value.trim();
            localStorage.setItem('pws_userName', newName);
            el('userNameDisplay').textContent = newName;
        }

        // Rasmni saqlash
        const file = imgInp.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result;
                localStorage.setItem('userImg', base64); // Base64 formatida saqlash
                el('userImg').src = base64;
                hideModal();
            };
            reader.readAsDataURL(file);
        } else {
            hideModal();
        }
    };
}

function init(){
  state.viewYear = state.today.getFullYear();
  state.viewMonth = state.today.getMonth() + 1;
  state.monthData = loadMonthData(state.viewYear, state.viewMonth);
  bindSettings(); bindActions(); applyTheme(); renderMonth(); setupProfile(); renderCalendar();
}

document.addEventListener('DOMContentLoaded', init);
