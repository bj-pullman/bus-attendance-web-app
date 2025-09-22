(async function () {
  async function api(path) {
    const r = await fetch(path, { credentials: 'include' });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  async function loadData() {
    try {
      // Bus Subs
      const subs = await api('/api/bus-subs');
      document.getElementById('subsContent').innerHTML = buildTable(subs);

      // Repairs
      const repairs = await api('/api/bus-repairs');
      document.getElementById('repairsContent').innerHTML = buildTable(repairs);

      // Field Trips
      const trips = await api('/api/field-trips');
      document.getElementById('tripsContent').innerHTML = buildTable(trips);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }

  function buildTable(data) {
    if (!data.length) return '<p>No active records</p>';

    // Hide unwanted fields
    const hidden = ['id', 'created_at','completed', 'completed_at'];

    // Grab headers except hidden ones
    const headers = Object.keys(data[0]).filter(h => !hidden.includes(h));

    let html = '<table><thead><tr>';
    headers.forEach(h => html += `<th>${formatHeader(h)}</th>`);
    html += '</tr></thead><tbody>';

    data.forEach(row => {
      html += '<tr>';
      headers.forEach(h => {
        let val = row[h];

        // Format dates (mm/dd/yyyy)
        if (h === 'date' && val) {
          const d = new Date(val);
          if (!isNaN(d)) {
            val = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
          }
        }

        html += `<td>${val ?? ''}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
  }

  function formatHeader(key) {
    // Nicely format header names
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // Load initially and refresh every 30s
  await loadData();
  setInterval(loadData, 30000);
})();
