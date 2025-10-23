const form = document.getElementById('logForm');
const tableBody = document.querySelector('#logsTable tbody');

const MONTHS_PL = [
  'STYCZEŃ', 'LUTY', 'MARZEC', 'KWIECIEŃ', 'MAJ', 'CZERWIEC',
  'LIPIEC', 'SIERPIEŃ', 'WRZESIEŃ', 'PAŹDZIERNIK', 'LISTOPAD', 'GRUDZIEŃ'
];

function calculateHours(start, end, breakMinutes) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);

  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes < startMinutes) endMinutes += 24 * 60;

  let total = (endMinutes - startMinutes - (breakMinutes || 0)) / 60;
  return Math.max(0, total);
}

function roundToQuarter(hours) {
  return (Math.round(hours * 4) / 4).toFixed(2);
}

function getPeriodLabel(dateStr) {
  const d = new Date(dateStr);
  let year = d.getFullYear();
  let month = d.getMonth() + 1;

  if (d.getDate() < 23) {
    month -= 1;
    if (month < 1) {
      month = 12;
      year--;
    }
  }

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const monthName = MONTHS_PL[nextMonth - 1];
  return `${monthName} ${nextYear}`;
}

const monthRates = {}; // zapamiętane stawki godzinowe dla miesięcy

let expandedPeriod = null; // kontrola tylko jednego rozwiniętego miesiąca

async function loadLogs() {
  const logs = await window.api.getLogs();
  tableBody.innerHTML = '';

  const grouped = {};
  logs.forEach(log => {
    const label = getPeriodLabel(log.date);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(log);
  });

  // sortowanie miesięcy po dacie (od najstarszego do najnowszego)
  const periods = Object.keys(grouped).sort((a, b) => {
    const [ma, ya] = a.split(' ');
    const [mb, yb] = b.split(' ');
    const indexA = MONTHS_PL.indexOf(ma);
    const indexB = MONTHS_PL.indexOf(mb);
    return new Date(ya, indexA) - new Date(yb, indexB);
  });

  // ostatni miesiąc automatycznie rozwinięty
  const lastPeriod = periods[periods.length - 1];
  expandedPeriod = expandedPeriod || lastPeriod;

  for (const period of periods) {
    const entries = grouped[period];
    let totalRounded = 0;
    const rate = monthRates[period] ?? 41;

    entries.forEach(log => {
      const breakVal = parseInt(log.break_minutes || 0);
      const hours = calculateHours(log.start_time, log.end_time, breakVal);
      const rounded = parseFloat(roundToQuarter(hours));
      totalRounded += rounded;
    });

    const totalRate = (totalRounded * rate).toFixed(2);

    // nagłówek miesiąca
    const summaryRow = document.createElement('tr');
    summaryRow.className = 'month-summary-row';
    summaryRow.innerHTML = `
      <td colspan="9" style="width:100%;">
        <span>${period}</span>
        <span style="float:right;">
          <b>${totalRounded.toFixed(2)} godz.</b> — ${totalRate} zł
          <button style="margin-left:10px;font-size:0.7rem;">${period === expandedPeriod ? 'Zwiń' : 'Rozwiń'}</button>
        </span>
      </td>
    `;
    tableBody.appendChild(summaryRow);

    // szczegóły
    const detailsContainer = document.createElement('tbody');
    detailsContainer.className = 'month-details';
    detailsContainer.style.display = period === expandedPeriod ? 'table-row-group' : 'none';
    detailsContainer.style.width = '100%';

    entries.forEach(log => {
      const breakVal = parseInt(log.break_minutes || 0);
      const hours = calculateHours(log.start_time, log.end_time, breakVal);
      const rounded = parseFloat(roundToQuarter(hours));
      const note = log.notes && log.notes.trim() !== '' ? log.notes : 'Brak';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${log.date}</td>
        <td>${log.start_time}</td>
        <td>${log.end_time}</td>
        <td>${breakVal}</td>
        <td>${hours.toFixed(2)}</td>
        <td>${rounded.toFixed(2)}</td>
        <td>${note}</td>
        <td><button class="edit" data-id="${log.id}">✏️</button></td>
        <td><button class="delete" data-id="${log.id}">🗑️</button></td>
      `;
      detailsContainer.appendChild(row);
    });

    tableBody.appendChild(detailsContainer);

    // logika rozwijania/zwijania
    const toggleBtn = summaryRow.querySelector('button');
    toggleBtn.onclick = () => {
      if (expandedPeriod === period) {
        expandedPeriod = null;
        detailsContainer.style.display = 'none';
        toggleBtn.textContent = 'Rozwiń';
      } else {
        // zwijamy poprzedni miesiąc
        document.querySelectorAll('.month-details').forEach(el => (el.style.display = 'none'));
        document.querySelectorAll('.month-summary-row button').forEach(el => (el.textContent = 'Rozwiń'));

        expandedPeriod = period;
        detailsContainer.style.display = 'table-row-group';
        toggleBtn.textContent = 'Zwiń';
      }
    };
  }

  // Edycja
  document.querySelectorAll('.edit').forEach(btn => {
    btn.onclick = async () => {
      const logs = await window.api.getLogs();
      const log = logs.find(l => l.id == btn.dataset.id);
      if (log) {
        document.getElementById('date').value = log.date;
        document.getElementById('start_time').value = log.start_time;
        document.getElementById('end_time').value = log.end_time;
        document.getElementById('break_minutes').value = log.break_minutes || 0;
        document.getElementById('notes').value = log.notes;
        form.dataset.editId = log.id;
      }
    };
  });

  // Usuwanie
  document.querySelectorAll('.delete').forEach(btn => {
    btn.onclick = async () => {
      if (confirm('Czy na pewno chcesz usunąć ten wpis?')) {
        await window.api.deleteLog(btn.dataset.id);
        loadLogs();
      }
    };
  });
}

form.onsubmit = async (e) => {
  e.preventDefault();

  const log = {
    date: date.value,
    start_time: start_time.value,
    end_time: end_time.value,
    break_minutes: break_minutes.value || 0,
    notes: notes.value && notes.value.trim() !== '' ? notes.value : 'Brak'
  };

  if (form.dataset.editId) {
    log.id = form.dataset.editId;
    await window.api.updateLog(log);
    form.dataset.editId = '';
  } else {
    await window.api.addLog(log);
  }

  form.reset();
  loadLogs();
};

loadLogs();