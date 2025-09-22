// main.js - renders dashboard tables, sets up buttons
// Using simple fetch (no bundler) - adapt to environment

window.isAdmin = false; // global admin flag

(async function () {
  // small inline fetch helpers (to keep site module-free)
  async function get(path) { const r=await fetch(path); if(!r.ok) throw new Error(await r.text()); return r.json(); }
  async function post(path, data) { const r=await fetch(path, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data)}); if(!r.ok) throw new Error(await r.text()); return r.json(); }

  const subsTbody = document.querySelector('#subsTable tbody');
  const repairsTbody = document.querySelector('#repairsTable tbody');
  const tripsTbody = document.querySelector('#tripsTable tbody');


  async function checkAdmin() {
    try {
      const res = await fetch('/api/session');
      const data = await res.json();
      isAdmin = data.isAdmin;
    } catch (err) {
      console.error('Failed to check admin', err);
    }
  }

  function formatDate12Hour(dateStr) {
  const date = new Date(dateStr);
  const options = { 
    month: '2-digit', day: '2-digit', year: 'numeric', 
    hour: 'numeric', minute: '2-digit', hour12: true 
  };
  return date.toLocaleString('en-US', options).replace(',', ' at');
}

  await checkAdmin();
  await loadAll();

  async function loadAll() {
    try {
      const [subs, repairs, trips] = await Promise.all([
        get('/api/bus-subs'),
        get('/api/bus-repairs'),
        get('/api/field-trips')
      ]);

      console.log('Repairs API data:', repairs);
      
      renderSubs(subs);
      renderRepairs(repairs);
      renderTrips(trips);
    } catch (err) {
      console.error('loadAll error', err);
    }
  }

  function rRow(attrs, cells) {
    const tr = document.createElement('tr');
    if (attrs && attrs.completed) tr.classList.add('completed');
    tr.dataset.id = attrs && attrs.id;
    cells.forEach(c => {
      const td = document.createElement('td');
      td.innerText = c;
      tr.appendChild(td);
    });
    return tr;
  }

  function addActionButtons(tr, tableName) {
    if (!window.isAdmin) return;

    const td = document.createElement('td');
    const markBtn = document.createElement('button');
    markBtn.innerText = tr.classList.contains('completed') ? 'Unmark' : 'Complete';
    markBtn.onclick = async () => {
      try {
        await fetch('/api/mark-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: tableName,
            id: tr.dataset.id,
            completed: tr.classList.contains('completed') ? 0 : 1
          })
        });
        await loadAll();
      } catch (e) {
        alert('Requires admin. Please log in.');
      }
    };
    td.appendChild(markBtn);
    tr.appendChild(td);
  }

  function renderSubs(rows) {
    subsTbody.innerHTML = '';

    // Sort rows by bus_number (numeric)
    rows.sort((a, b) => Number(a.bus_number) - Number(b.bus_number));

    rows.forEach(r => {
      const tr = rRow(r, [r.bus_number, r.morning_sub, r.afternoon_sub]);
      addActionButtons(tr, 'bus_subs');
      subsTbody.appendChild(tr);
    });
  }

  function renderRepairs(rows) {
    repairsTbody.innerHTML = '';

    // Sort by newest first
    rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    rows.forEach(r => {
      const formattedDate = formatDate12Hour(r.created_at);
      const tr = rRow(r, [r.down_bus_number, r.reason, r.sub_bus_number, formattedDate]);
      addActionButtons(tr, 'bus_repairs');
      repairsTbody.appendChild(tr);
    });
  }
  
  function renderTrips(rows) {
    tripsTbody.innerHTML = '';
    rows.forEach(r => {
      const tr = rRow(r, [r.date, r.from_location, r.to_location, r.start_time, r.end_time, r.driver, r.bus_number]);
      addActionButtons(tr, 'field_trips');
      tripsTbody.appendChild(tr);
    });
  }

  document.getElementById('presentationBtn').addEventListener('click', () => {
    window.open('/presentation.html', '_blank'); // later we will create it
  });

  document.getElementById('logBtn').addEventListener('click', () => {
    window.location.href = 'log.html';
  });

  await loadAll();

  // reload every 45s so TV mode and dashboard stay fresh
  setInterval(loadAll, 45000);

  window.loadAll = loadAll;

})();
