document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('logForm');
  const cancelBtn = document.getElementById('cancelEdit');
  const monthsContainer = document.getElementById('monthsContainer');
  let editingId = null;

  async function loadLogs() {
    const logs = await window.api.getLogs();
    renderMonths(logs);
  }

  function groupByMonth(logs) {
    const months = {};

    logs.forEach(log => {
      const date = new Date(log.date);
      let periodEnd = new Date(date);
      if (date.getDate() < 23) periodEnd.setMonth(date.getMonth());
      else periodEnd.setMonth(date.getMonth() + 1);

      const monthName = periodEnd.toLocaleString('pl-PL', { month: 'long' }).toUpperCase();
      const key = `${monthName} ${periodEnd.getFullYear()}`;
      if (!months[key]) months[key] = [];
      months[key].push(log);
    });

    // najnowsze miesiące pierwsze
    return Object.fromEntries(
      Object.entries(months).sort((a, b) => {
        const [ma, ya] = a[0].split(' ');
        const [mb, yb] = b[0].split(' ');
        const da = new Date(`${ya}-${ma}-01`);
        const db = new Date(`${yb}-${mb}-01`);
        return db - da;
      })
    );
  }

  function calculateHours(start, end, breakMin) {
    const s = new Date(`1970-01-01T${start}:00`);
    const e = new Date(`1970-01-01T${end}:00`);
    let diff = (e - s) / 1000 / 3600 - (breakMin || 0) / 60;
    return Math.max(diff, 0);
  }

  function roundQuarter(h) {
    const quarters = [0, 0.25, 0.5, 0.75, 1];
    const nearest = quarters.reduce((prev, curr) =>
      Math.abs(curr - (h % 1)) < Math.abs(prev - (h % 1)) ? curr : prev
    );
    return Math.floor(h) + nearest;
  }

  function renderMonths(logs) {
    monthsContainer.innerHTML = '';
    const grouped = groupByMonth(logs);
    const monthKeys = Object.keys(grouped);

    if (monthKeys.length === 0) {
      monthsContainer.innerHTML = '<p style="margin:20px;">Brak danych</p>';
      return;
    }

    monthKeys.forEach((monthKey, idx) => {
      const monthLogs = grouped[monthKey];
      const monthDiv = document.createElement('div');
      monthDiv.classList.add('month-block');

      let total = 0;
      monthLogs.forEach(l => total += calculateHours(l.start_time, l.end_time, l.break_minutes || 0));
      const roundedTotal = roundQuarter(total);

      monthDiv.innerHTML = `
        <div class="month-summary-row">
          <div>${monthKey}</div>
          <div>${roundedTotal.toFixed(2)} godz. | ${(roundedTotal * 41).toFixed(2)} zł</div>
        </div>
        <div class="month-details" style="display:${idx === 0 ? 'block' : 'none'};">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Start</th>
                <th>Koniec</th>
                <th>Przerwa (min)</th>
                <th>Godziny</th>
                <th>Zaokr.</th>
                <th>Notatka</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              ${monthLogs.map(l => {
                const hrs = calculateHours(l.start_time, l.end_time, l.break_minutes || 0);
                const r = roundQuarter(hrs);
                return `
                  <tr data-id="${l.id}">
                    <td>${l.date}</td>
                    <td>${l.start_time}</td>
                    <td>${l.end_time}</td>
                    <td>${l.break_minutes || 0}</td>
                    <td>${hrs.toFixed(2)}</td>
                    <td>${r.toFixed(2)}</td>
                    <td>${l.notes || 'Brak'}</td>
                    <td>
                      <button class="edit-btn" data-id="${l.id}">Edytuj</button>
                      <button class="delete-btn" data-id="${l.id}">Usuń</button>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;

      monthsContainer.appendChild(monthDiv);

      const summaryRow = monthDiv.querySelector('.month-summary-row');
      const details = monthDiv.querySelector('.month-details');

      summaryRow.addEventListener('click', () => {
        document.querySelectorAll('.month-details').forEach(el => el.style.display = 'none');
        details.style.display = 'block';
      });

      details.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          const id = e.target.dataset.id;
          await window.api.deleteLog(Number(id));
          loadLogs();
        });
      });

      details.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          const id = Number(e.target.dataset.id);
          const log = logs.find(l => l.id === id);
          if (!log) return;

          document.getElementById('date').value = log.date;
          document.getElementById('start_time').value = log.start_time;
          document.getElementById('end_time').value = log.end_time;
          document.getElementById('break_minutes').value = log.break_minutes || 0;
          document.getElementById('notes').value = log.notes || 'Brak';
          editingId = id;

          form.querySelector('button').textContent = 'Zapisz zmiany';
          form.querySelector('button').style.backgroundColor = '#28a745';
          cancelBtn.style.display = 'inline-block';
        });
      });
    });
  }

  // Zapis / Edycja
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const log = {
      date: document.getElementById('date').value,
      start_time: document.getElementById('start_time').value,
      end_time: document.getElementById('end_time').value,
      break_minutes: parseInt(document.getElementById('break_minutes').value) || 0,
      notes: document.getElementById('notes').value.trim() || 'Brak'
    };

    if (editingId) {
      log.id = editingId;
      await window.api.updateLog(log);
      editingId = null;
      cancelBtn.style.display = 'none';
      form.querySelector('button').textContent = 'Dodaj';
      form.querySelector('button').style.backgroundColor = '#007bff';
    } else {
      await window.api.addLog(log);
    }

    form.reset();
    loadLogs();
  });

  // Anuluj edycję
  cancelBtn.addEventListener('click', () => {
    form.reset();
    editingId = null;
    cancelBtn.style.display = 'none';
    form.querySelector('button').textContent = 'Dodaj';
    form.querySelector('button').style.backgroundColor = '#007bff';
  });

  await loadLogs();
});
