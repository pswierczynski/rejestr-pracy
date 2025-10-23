const form = document.getElementById('logForm');
const tableBody = document.querySelector('#logsTable tbody');

async function loadLogs() {
  const logs = await window.api.getLogs();
  tableBody.innerHTML = '';

  logs.forEach(log => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${log.date}</td>
      <td>${log.start_time}</td>
      <td>${log.end_time}</td>
      <td>${log.break_minutes || ''}</td>
      <td>${log.notes || ''}</td>
      <td><button data-id="${log.id}">✏️</button></td>
    `;
    tableBody.appendChild(row);
  });

  document.querySelectorAll('button[data-id]').forEach(btn => {
    btn.onclick = async () => {
      const logs = await window.api.getLogs();
      const log = logs.find(l => l.id == btn.dataset.id);
      if (log) {
        document.getElementById('date').value = log.date;
        document.getElementById('start_time').value = log.start_time;
        document.getElementById('end_time').value = log.end_time;
        document.getElementById('break_minutes').value = log.break_minutes;
        document.getElementById('notes').value = log.notes;
        form.dataset.editId = log.id;
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
    break_minutes: break_minutes.value,
    notes: notes.value
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