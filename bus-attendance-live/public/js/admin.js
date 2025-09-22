// admin.js
(function () {
  // small helpers
  async function api(path, opts={}) {
    opts.credentials = 'include';
    if (!opts.headers) opts.headers = { 'Content-Type': 'application/json' };
    const r = await fetch(path, opts);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  const adminBtn = document.getElementById('adminBtn');
  const adminPanel = document.getElementById('adminPanel');
  const loginArea = document.getElementById('loginArea');
  const adminArea = document.getElementById('adminArea');
  const loginSubmit = document.getElementById('loginSubmit');
  const adminPassword = document.getElementById('adminPassword');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');

  const adminForm = document.getElementById('adminForm');
  const adminSection = document.getElementById('adminSection');
  const formFields = document.getElementById('formFields');

  const sectionFields = {
    bus_subs: [
      { name: 'bus_number', label: 'Bus #', pattern: '\\d+', title: 'Bus number must be numeric' },
      { name: 'morning_sub', label: 'Morning Sub' },
      { name: 'afternoon_sub', label: 'Afternoon Sub' }
    ],
    bus_repairs: [
      { name: 'down_bus_number', label: 'Down Bus #', pattern: '\\d+', title: 'Bus number must be numeric' },
      { name: 'reason', label: 'Reason or Description' },
      { name: 'sub_bus_number', label: 'Sub Bus #', pattern: '\\d*', title: 'Bus number must be numeric (optional)' }
    ],
    field_trips: [
      { name: 'date', label: 'Date (YYYY-MM-DD)', pattern: '\\d{4}-\\d{2}-\\d{2}', title: 'Date must be in YYYY-MM-DD format' },
      { name: 'from_location', label: 'From' },
      { name: 'to_location', label: 'To' },
      { name: 'start_time', label: 'Start Time (HH:MM)', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$', title: 'Time must be HH:MM (24-hour)' },
      { name: 'end_time', label: 'End Time (HH:MM)', pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$', title: 'Time must be HH:MM (24-hour)' },
      { name: 'driver', label: 'Driver' },
      { name: 'bus_number', label: 'Bus #', pattern: '\\d+', title: 'Bus number must be numeric' }
    ]
  };



  // mark an item as complete/incomplete
  async function markComplete(table, id, completed) {
    await api('/api/mark-complete', {
      method: 'POST',
      body: JSON.stringify({ table, id, completed })
    });

    // Update the row visually
    const tr = document.querySelector(`tr[data-id="${id}"]`);
    if (tr) {
      if (completed) {
        tr.classList.add('completed');
      } else {
        tr.classList.remove('completed');
      }
    }
  }

  function buildForm(section) {
    formFields.innerHTML = '';
    const fields = sectionFields[section];
    fields.forEach(f => {
      const lbl = document.createElement('label');
      lbl.innerText = f.label;

      const input = document.createElement('input');
      input.name = f.name;
      input.type = 'text';  // always text to avoid tickers/date pickers
      input.required = true;

      if (f.pattern) input.pattern = f.pattern;
      if (f.title) input.title = f.title;

      formFields.appendChild(lbl);
      formFields.appendChild(input);
    });

    // hidden id for update
    const idInput = document.createElement('input');
    idInput.name = 'id';
    idInput.type = 'hidden';
    formFields.appendChild(idInput);
  }

  adminSection.addEventListener('change', () => buildForm(adminSection.value));
  buildForm(adminSection.value);

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    window.isAdmin = true;        // update global flag
    if (window.loadAll) window.loadAll(); // refresh tables so buttons appear immediately
    // e.preventDefault(); // prevent page reload
    loginMsg.innerText = '';
    try {
      await api('/api/login', { method: 'POST', body: JSON.stringify({ password: adminPassword.value }) });
      loginArea.style.display = 'none';
      adminArea.style.display = 'block';
      document.getElementById('logoutBtn').style.display = 'inline-block';
      const logBtn = document.getElementById('logBtn');
      if (logBtn) logBtn.style.display = 'inline-block';

      adminPassword.value = '';
      loginMsg.innerText = '';
    } catch (err) {
      loginMsg.innerText = 'Invalid password';
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await api('/api/logout', { method: 'POST' }); // log out on server first

      window.isAdmin = false;               // update global admin flag
      if (window.loadAll) await window.loadAll();  // refresh tables so buttons disappear

      adminArea.style.display = 'none';
      loginArea.style.display = 'block';
      logoutBtn.style.display = 'none';

      const logBtn = document.getElementById('logBtn');
      if (logBtn) logBtn.style.display = 'none'; // hide log on logout

    } catch (err) {
      console.error('Logout failed', err);
    }
  });

  adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();

      // HTML5 validation check
    if (!adminForm.checkValidity()) {
      adminForm.reportValidity(); // show browser's validation popup
      return;
    }
    const formData = new FormData(adminForm);
    const payload = {};
    for (const [k, v] of formData.entries()) payload[k] = v;
    const section = adminSection.value;
    const routeMap = {
      bus_subs: 'bus-subs',
      bus_repairs: 'bus-repairs',
      field_trips: 'field-trips'
    };
    const apiSection = routeMap[section];

    if (payload.id) {
      // update
      const id = payload.id;
      delete payload.id;
      await api(`/api/${apiSection}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      alert('Updated');
    } else {
      // create
      await api(`/api/${apiSection}`, { method: 'POST', body: JSON.stringify(payload) });
    }
    // refresh page (simple)
    window.location.reload();
  });

  // click row to toggle "complete" status or edit
  document.addEventListener('click', async (e) => {
    const tr = e.target.closest('tr');
    if (!tr || !tr.dataset.id) return;

    const id = tr.dataset.id;
    const parentTable = tr.closest('table').id;
    let section = '';
    if (parentTable === 'subsTable') section = 'bus_subs';
    if (parentTable === 'repairsTable') section = 'bus_repairs';
    if (parentTable === 'tripsTable') section = 'field_trips';
    if (!section) return;

    // If user holds Shift while clicking -> mark complete toggle
    if (e.shiftKey) {
      const isCompleted = tr.classList.contains('completed');
      await markComplete(section, id, !isCompleted);
      return;
    }

    // otherwise -> open edit form
    const data = await api(`/api/${section}`);
    const item = data.find(r => String(r.id) === String(id));
    if (!item) return;
    adminSection.value = section;
    buildForm(section);
    for (const k in item) {
      const input = adminForm.querySelector(`[name="${k}"]`);
      if (input) input.value = item[k];
    }
    adminForm.querySelector(`[name="id"]`).value = item.id;
    loginArea.style.display = 'none';
    adminArea.style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'inline-block';
  });

  // --- check session on page load ---
  (async () => {
    try {
      const res = await api('/api/session');
      if (res.isAdmin) {
        loginArea.style.display = 'none';
        adminArea.style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'inline-block';

        // 🔹 Ensure Log button stays visible after refresh
        const logBtn = document.getElementById('logBtn');
        if (logBtn) logBtn.style.display = 'inline-block';
      }
    } catch (err) {
      console.log('Session check failed:', err);
    }
  })();

})();
