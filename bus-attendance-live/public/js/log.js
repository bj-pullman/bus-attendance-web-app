(async function () {
  async function api(path) {
    const r = await fetch(path, { credentials: 'include' });
    if (!r.ok) {
      const msg = await r.text();
      throw new Error(`${r.status} ${msg}`);
    }
    return r.json();
  }

  // --- Check session on page load ---
  try {
    const res = await api('/api/session');
    if (!res.isAdmin) {
      window.location.href = '/index.html';
      return;
    }
  } catch (err) {
    console.error('Session check failed:', err);
    window.location.href = '/index.html';
    return;
  }

  // containers for each log section
  const subsContainer = document.getElementById('subsLog');
  const repairsContainer = document.getElementById('repairsLog');
  const tripsContainer = document.getElementById('tripsLog');

  // map section → container
  const sectionMap = {
    bus_subs: subsContainer,
    bus_repairs: repairsContainer,
    field_trips: tripsContainer
  };

  // fetch + render each section
  for (const section of Object.keys(sectionMap)) {
    try {
      const data = await api(`/api/log/${section}`);
      if (!data.length) continue;

      const hidden = ['id', 'completed'];
      const headers = Object.keys(data[0]).filter(h => !hidden.includes(h));

      // clear container
      const container = sectionMap[section];
      container.innerHTML = '';

      // create card wrapper
      const card = document.createElement('div');
      card.className = 'log-card';

      const h2 = document.createElement('h2');
      h2.textContent = section.replace(/_/g, ' ').toUpperCase();
      card.appendChild(h2);

      // build table
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      thead.innerHTML = `<tr>${headers.map(h => `<th>${formatHeader(h)}</th>`).join('')}</tr>`;
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = headers.map(h => `<td>${formatValue(h, row[h])}</td>`).join('');
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);

      card.appendChild(table);
      container.appendChild(card);
    } catch (err) {
      console.error(`Failed to fetch log for ${section}:`, err);
    }
  }

document.querySelectorAll('.log-nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    // hide all sections
    document.querySelectorAll('.log-section').forEach(sec => sec.style.display = 'none');

    // remove active from all buttons
    document.querySelectorAll('.log-nav button').forEach(b => b.classList.remove('active'));

    // show target + activate button
    const target = btn.dataset.target;
    document.getElementById(target).style.display = 'block';
    btn.classList.add('active');
  });
});

// make first button active by default
document.querySelector('.log-nav button').classList.add('active');

  // helpers
  function formatHeader(key) {
    if (key === 'created_at') return 'Date Created';
    if (key === 'completed_at') return 'Completed At';
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function formatValue(key, val) {
    if (key === 'completed_at' && !val) return 'Not completed';
    if (key === 'created_at' || key === 'completed_at' || key === 'date') {
      return val ? formatTimestamp(val) : '';
    }
    return val !== null && val !== undefined ? val : '';
  }

  function formatTimestamp(isoString) {
    const date = new Date(isoString);

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    return `${month}/${day}/${year} at ${hours}:${minutes}:${seconds}${ampm}`;
  }
})();

// Dashboard button
document.getElementById('dashboardBtn').addEventListener('click', () => {
  window.location.href = '/index.html';
});
