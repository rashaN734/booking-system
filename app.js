/* ============================================================
   BookEase — app.js
   PHP + MySQL backend සමඟ connect වන frontend logic
   ============================================================ */

const API = 'api';

let currentUser    = null;
let currentPage    = 'home';
let cancelTargetId = null;

/* ============================================================
   API HELPER — fetch wrapper
============================================================ */
async function api(path, method, body) {
  method = method || 'GET';
  var opts = {
    method: method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);

  var res;
  try {
    res = await fetch(API + '/' + path, opts);
  } catch (e) {
    throw new Error('Network error — WAMP server running ද? (http://localhost/bookease)');
  }

  var data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error('Server response error (status: ' + res.status + ')');
  }

  if (!res.ok) {
    throw new Error(data.error || 'Request failed (' + res.status + ')');
  }
  return data;
}

/* ============================================================
   SERVICES DATA
============================================================ */
var SERVICES = [
  { id:'dental',  name:'Dental Checkup',  icon:'🦷', duration:60,  price:120 },
  { id:'eye',     name:'Eye Examination',  icon:'👁️', duration:45,  price:90  },
  { id:'haircut', name:'Haircut & Style',  icon:'✂️', duration:30,  price:45  },
  { id:'consult', name:'Consultation',     icon:'💬', duration:30,  price:60  },
  { id:'physio',  name:'Physiotherapy',    icon:'🏃', duration:60,  price:110 },
  { id:'massage', name:'Massage Therapy',  icon:'💆', duration:90,  price:140 }
];

var TIME_SLOTS = [
  '8:00 AM','8:30 AM','9:00 AM','9:30 AM',
  '10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '1:00 PM','1:30 PM','2:00 PM','2:30 PM',
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM'
];

/* ============================================================
   NAVIGATION
============================================================ */
function navigate(page) {
  if ((page === 'book' || page === 'appointments') && !currentUser) {
    showToast('Please sign in to continue', 'warning');
    page = 'login';
  }
  if (page === 'admin' && (!currentUser || currentUser.role !== 'admin')) {
    showToast('Admin access required', 'error');
    return;
  }
  if (page === currentPage) return;

  var bar = document.getElementById('page-transition-bar');
  if (bar) { bar.classList.add('running'); setTimeout(function(){ bar.classList.remove('running'); }, 500); }

  var currentEl = document.getElementById('page-' + currentPage);
  var nextEl    = document.getElementById('page-' + page);

  if (currentEl && currentEl !== nextEl) {
    currentEl.classList.add('slide-out');
    currentEl.classList.remove('active');
    setTimeout(function(){
      currentEl.classList.remove('slide-out');
      currentEl.style.display = 'none';
    }, 300);
  }

  setTimeout(function(){
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) {
      if (pages[i] !== nextEl) pages[i].classList.remove('active');
    }
    if (nextEl) {
      nextEl.style.display = 'block';
      void nextEl.offsetWidth;
      nextEl.classList.add('active');
    }

    currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    var navLinks = document.querySelectorAll('.nav-links a');
    for (var j = 0; j < navLinks.length; j++) navLinks[j].classList.remove('active');
    var navEl = document.getElementById('nav-' + page);
    if (navEl) navEl.classList.add('active');

    var nl = document.getElementById('nav-links');
    if (nl) nl.classList.remove('open');

    if (page === 'book')         initBookPage();
    if (page === 'appointments') renderAppointments('all');
    if (page === 'admin')        initAdmin();

  }, currentEl ? 150 : 0);
}

function toggleMobileNav() {
  var nl = document.getElementById('nav-links');
  if (nl) nl.classList.toggle('open');
}

function updateNav() {
  var u = currentUser;
  toggle('nav-login-li',    !!u);
  toggle('nav-register-li', !!u);
  toggle('nav-logout-li',   !u);
  toggle('nav-book-li',     !u);
  toggle('nav-appts-li',    !u);
  toggle('nav-admin-li',    !(u && u.role === 'admin'));
}

function toggle(id, hide) {
  var el = document.getElementById(id);
  if (!el) return;
  if (hide) el.classList.add('hidden');
  else el.classList.remove('hidden');
}

/* ============================================================
   TOAST
============================================================ */
function showToast(msg, type) {
  type = type || 'info';
  var icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  var tc = document.getElementById('toast-container');
  if (!tc) return;
  var t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = '<span class="toast-icon">' + (icons[type]||'ℹ️') + '</span> ' + msg;
  tc.appendChild(t);
  setTimeout(function(){ t.style.opacity='0'; setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, 400); }, 3500);
}

/* ============================================================
   FORM HELPERS
============================================================ */
function clearErrors(ids) {
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el) el.classList.remove('show');
    var inp = el && el.previousElementSibling;
    if (inp && inp.tagName !== 'DIV') inp.classList.remove('error');
  }
}

function showFieldError(inputId, errId, msg) {
  var inp = document.getElementById(inputId);
  var err = document.getElementById(errId);
  if (inp) inp.classList.add('error');
  if (err) { if (msg) err.textContent = msg; err.classList.add('show'); }
}

/* ============================================================
   REGISTER
============================================================ */
async function doRegister() {
  clearErrors(['err-reg-name','err-reg-email','err-reg-pass','err-reg-pass2']);

  var name  = document.getElementById('reg-name').value.trim();
  var email = document.getElementById('reg-email').value.trim().toLowerCase();
  var phone = document.getElementById('reg-phone').value.trim();
  var pass  = document.getElementById('reg-pass').value;
  var pass2 = document.getElementById('reg-pass2').value;

  var valid = true;
  if (!name)                          { showFieldError('reg-name','err-reg-name','Please enter your full name'); valid=false; }
  if (!email || !email.includes('@')) { showFieldError('reg-email','err-reg-email','Enter a valid email address'); valid=false; }
  if (pass.length < 6)                { showFieldError('reg-pass','err-reg-pass','Password must be at least 6 characters'); valid=false; }
  if (pass !== pass2)                 { showFieldError('reg-pass2','err-reg-pass2','Passwords do not match'); valid=false; }
  if (!valid) return;

  var btn = document.getElementById('btn-register');
  btn.innerHTML = '<span class="spinner"></span> Creating…';
  btn.disabled  = true;

  try {
    var res = await api('auth/register.php', 'POST', {
      name: name, email: email, phone: phone, password: pass
    });
    currentUser = res.user;
    updateNav();
    showToast('Welcome, ' + res.user.name + '! Account created 🎉', 'success');
    navigate('book');
  } catch (err) {
    var msg = err.message || 'Registration failed';
    if (msg.toLowerCase().indexOf('email') !== -1) {
      showFieldError('reg-email','err-reg-email', msg);
    } else {
      showToast(msg, 'error');
    }
  } finally {
    btn.innerHTML = 'Create Account';
    btn.disabled  = false;
  }
}

/* ============================================================
   LOGIN
============================================================ */
async function doLogin() {
  clearErrors(['err-login-email','err-login-pass']);

  var email = document.getElementById('login-email').value.trim().toLowerCase();
  var pass  = document.getElementById('login-pass').value;

  var valid = true;
  if (!email) { showFieldError('login-email','err-login-email','Enter your email address'); valid=false; }
  if (!pass)  { showFieldError('login-pass','err-login-pass','Enter your password'); valid=false; }
  if (!valid) return;

  var btn = document.getElementById('btn-login');
  btn.innerHTML = '<span class="spinner"></span> Signing in…';
  btn.disabled  = true;

  try {
    var res = await api('auth/login.php', 'POST', { email: email, password: pass });
    currentUser = res.user;
    updateNav();
    showToast('Welcome back, ' + res.user.name + '! 👋', 'success');
    navigate(res.user.role === 'admin' ? 'admin' : 'book');
  } catch (err) {
    showFieldError('login-email','err-login-email', err.message || 'Invalid email or password');
    showFieldError('login-pass','err-login-pass',' ');
  } finally {
    btn.innerHTML = 'Sign In';
    btn.disabled  = false;
  }
}

/* ============================================================
   LOGOUT
============================================================ */
async function logout() {
  try { await api('auth/logout.php', 'POST'); } catch(e) {}
  currentUser = null;
  updateNav();
  showToast('Signed out successfully', 'info');
  navigate('home');
}

/* ============================================================
   DEMO USER
============================================================ */
async function demoUser() {
  showToast('Signing in as Demo User…', 'info');
  try {
    var res;
    try {
      res = await api('auth/login.php', 'POST', { email:'demo@user.com', password:'demo123' });
    } catch(e) {
      res = await api('auth/register.php', 'POST', {
        name:'Demo User', email:'demo@user.com', phone:'', password:'demo123'
      });
    }
    currentUser = res.user;
    updateNav();
    showToast('Signed in as Demo User 👤', 'success');
    navigate('book');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ============================================================
   BOOKING PAGE
============================================================ */
var selectedService = null;
var selectedTime    = null;

function initBookPage() {
  selectedService = null;
  selectedTime    = null;
  renderServices();
  updateSummary();

  var today  = new Date().toISOString().split('T')[0];
  var dateEl = document.getElementById('book-date');
  if (dateEl) { dateEl.min = today; dateEl.value = ''; }

  var sc = document.getElementById('time-slots-container');
  if (sc) sc.innerHTML = '<p style="color:var(--ink-muted);font-size:0.875rem;">Select a date first to see available slots</p>';
}

function renderServices() {
  var grid = document.getElementById('service-grid');
  if (!grid) return;
  var html = '';
  for (var i = 0; i < SERVICES.length; i++) {
    var s = SERVICES[i];
    html += '<div class="service-option">' +
      '<input type="radio" name="service" id="svc-' + s.id + '" value="' + s.id + '" onchange="selectService(\'' + s.id + '\')" />' +
      '<label for="svc-' + s.id + '">' +
        '<span class="svc-icon">' + s.icon + '</span>' +
        '<span class="svc-name">' + s.name + '</span>' +
        '<span class="svc-dur">' + s.duration + ' min · $' + s.price + '</span>' +
      '</label>' +
    '</div>';
  }
  grid.innerHTML = html;
}

function selectService(id) {
  for (var i = 0; i < SERVICES.length; i++) {
    if (SERVICES[i].id === id) { selectedService = SERVICES[i]; break; }
  }
  var err = document.getElementById('err-service');
  if (err) err.classList.remove('show');
  updateSummary();
}

async function loadTimeSlots() {
  var dateEl = document.getElementById('book-date');
  var date   = dateEl ? dateEl.value : '';
  if (!date) return;

  var d   = new Date(date + 'T12:00:00');
  var day = d.getDay();
  var container = document.getElementById('time-slots-container');

  if (day === 0 || day === 6) {
    if (container) container.innerHTML = '<p style="color:var(--warning);font-size:0.875rem;">⚠️ Weekends are unavailable. Please select a weekday.</p>';
    if (dateEl) dateEl.classList.add('error');
    var errDate = document.getElementById('err-date');
    if (errDate) { errDate.textContent = 'Weekends are not available'; errDate.classList.add('show'); }
    selectedTime = null;
    updateSummary();
    return;
  }

  if (dateEl) dateEl.classList.remove('error');
  var errDate2 = document.getElementById('err-date');
  if (errDate2) errDate2.classList.remove('show');
  selectedTime = null;

  if (container) {
    var skeletons = '';
    for (var k = 0; k < 8; k++) skeletons += '<div class="time-slot-btn" style="background:var(--surface-2);color:transparent;animation:pulse 1s ease infinite;">…</div>';
    container.innerHTML = '<div class="time-slots-grid" style="opacity:0.5;pointer-events:none;">' + skeletons + '</div>';
  }

  try {
    var res = await api('appointments/slots.php?date=' + date);
    var bookedSlots = res.booked || [];

    var slotHtml = '<div class="time-slots-grid">';
    for (var t = 0; t < TIME_SLOTS.length; t++) {
      var slot     = TIME_SLOTS[t];
      var isBooked = bookedSlots.indexOf(slot) !== -1;
      if (isBooked) {
        slotHtml += '<button class="time-slot-btn booked" disabled title="Already booked" style="animation:fadeUp 0.3s ' + (t*0.035) + 's both;">' + slot + '</button>';
      } else {
        slotHtml += '<button class="time-slot-btn" onclick="selectTimeSlot(\'' + slot + '\',this)" style="animation:fadeUp 0.3s ' + (t*0.035) + 's both;">' + slot + '</button>';
      }
    }
    slotHtml += '</div>';
    slotHtml += '<p style="font-size:0.78rem;color:var(--ink-muted);margin-top:10px;">' + bookedSlots.length + ' slot' + (bookedSlots.length !== 1 ? 's' : '') + ' already booked for this date</p>';

    if (container) container.innerHTML = slotHtml;
  } catch (err) {
    if (container) container.innerHTML = '<p style="color:var(--danger);font-size:0.875rem;">⚠️ Could not load slots: ' + err.message + '</p>';
  }

  updateSummary();
}

function selectTimeSlot(time, btn) {
  var btns = document.querySelectorAll('.time-slot-btn');
  for (var i = 0; i < btns.length; i++) btns[i].classList.remove('selected');
  btn.classList.add('selected');
  selectedTime = time;
  var errTime = document.getElementById('err-time');
  if (errTime) errTime.classList.remove('show');
  updateSummary();
}

function updateSummary() {
  var s = selectedService;
  var dateEl = document.getElementById('book-date');
  var d = dateEl ? dateEl.value : '';
  var t = selectedTime;

  var ss = document.getElementById('sum-service');
  var sd = document.getElementById('sum-duration');
  var sp = document.getElementById('sum-price');
  var sdt= document.getElementById('sum-date');
  var st = document.getElementById('sum-time');

  if (ss) ss.innerHTML  = s ? s.name : '<em class="empty">Not selected</em>';
  if (sd) sd.innerHTML  = s ? s.duration + ' min' : '<em class="empty">—</em>';
  if (sp) sp.innerHTML  = s ? '$' + s.price : '<em class="empty">—</em>';
  if (sdt) {
    if (d) {
      sdt.textContent = new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
    } else {
      sdt.innerHTML = '<em class="empty">Not selected</em>';
    }
  }
  if (st) st.innerHTML = t ? t : '<em class="empty">Not selected</em>';
}

async function doBook() {
  var valid = true;
  var errSvc = document.getElementById('err-service');
  if (!selectedService) { if(errSvc) errSvc.classList.add('show'); valid=false; }

  var dateEl = document.getElementById('book-date');
  var date   = dateEl ? dateEl.value : '';
  if (!date) {
    if (dateEl) dateEl.classList.add('error');
    var ed = document.getElementById('err-date');
    if (ed) { ed.textContent='Please select a date'; ed.classList.add('show'); }
    valid = false;
  }

  var errTime = document.getElementById('err-time');
  if (!selectedTime) { if(errTime) errTime.classList.add('show'); valid=false; }
  if (!valid) { showToast('Please fill in all required fields', 'warning'); return; }

  var btn = document.getElementById('btn-book');
  btn.innerHTML = '<span class="spinner"></span> Booking…';
  btn.disabled  = true;

  try {
    var notesEl = document.getElementById('book-notes');
    var notes   = notesEl ? notesEl.value.trim() : '';
    await api('appointments/book.php', 'POST', {
      service:    selectedService.name,
      service_id: selectedService.id,
      icon:       selectedService.icon,
      date:       date,
      time:       selectedTime,
      duration:   selectedService.duration,
      price:      selectedService.price,
      notes:      notes
    });
    showToast('Appointment booked successfully! 🎉', 'success');
    navigate('appointments');
  } catch (err) {
    showToast(err.message, 'error');
    loadTimeSlots();
  } finally {
    btn.innerHTML = 'Confirm Booking';
    btn.disabled  = false;
  }
}

/* ============================================================
   MY APPOINTMENTS
============================================================ */
var currentFilter = 'all';

async function renderAppointments(filter) {
  currentFilter = filter;
  var list = document.getElementById('appointments-list');
  if (!list) return;
  list.innerHTML = '<div style="text-align:center;padding:60px;"><span class="spinner" style="border-color:var(--surface-3);border-top-color:var(--accent);width:28px;height:28px;"></span></div>';

  try {
    var res   = await api('appointments/list.php?status=' + filter);
    var appts = res.appointments || [];

    if (appts.length === 0) {
      list.innerHTML =
        '<div class="empty-state" style="animation:fadeUp 0.4s 0.1s both;">' +
          '<div class="empty-icon">📭</div>' +
          '<h3>No ' + (filter==='all'?'':filter) + ' appointments</h3>' +
          '<p>' + (filter==='all' ? "You haven't made any bookings yet." : 'No ' + filter + ' appointments found.') + '</p>' +
          (filter==='all' ? '<button class="btn btn-primary" onclick="navigate(\'book\')">Book Your First Appointment</button>' : '') +
        '</div>';
      return;
    }

    var html = '<div class="appointments-grid">';
    for (var i = 0; i < appts.length; i++) {
      html += '<div style="animation:fadeUp 0.45s ' + (0.05 + i*0.07) + 's cubic-bezier(0.22,1,0.36,1) both;">' + buildApptCard(appts[i]) + '</div>';
    }
    html += '</div>';
    list.innerHTML = html;
  } catch (err) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Error loading appointments</h3><p>' + err.message + '</p></div>';
  }
}

function buildApptCard(a) {
  var fd  = new Date(a.date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
  var bc  = a.status === 'pending' ? 'badge-pending' : a.status === 'confirmed' ? 'badge-confirmed' : 'badge-cancelled';
  var sl  = a.status.charAt(0).toUpperCase() + a.status.slice(1);
  var notesHtml = a.notes ? ' &nbsp;·&nbsp; 📝 "' + a.notes.substring(0,40) + (a.notes.length>40?'…':'') + '"' : '';
  var cancelBtn = a.status !== 'cancelled' ? '<button class="btn btn-sm btn-danger" onclick="openCancelModal(' + a.id + ')">Cancel</button>' : '';
  var pendingTxt= a.status === 'pending'   ? '<span style="font-size:0.78rem;color:var(--ink-muted);">Awaiting confirmation</span>' : '';

  return '<div class="appointment-card">' +
    '<div class="appt-header">' +
      '<span class="appt-service">' + a.serviceIcon + ' ' + a.service + '</span>' +
      '<span class="mini-slot-badge ' + bc + '">' + sl + '</span>' +
    '</div>' +
    '<div class="appt-body">' +
      '<div class="appt-datetime">' +
        '<span class="appt-date">' + fd + '</span>' +
        '<span class="appt-time">at ' + a.time + '</span>' +
      '</div>' +
      '<div class="appt-meta">🕐 ' + a.duration + ' min &nbsp;·&nbsp; 💰 $' + a.price + notesHtml + '</div>' +
      '<div class="appt-actions">' + cancelBtn + pendingTxt + '</div>' +
    '</div>' +
  '</div>';
}

function filterAppointments(filter, btn) {
  var btns = document.querySelectorAll('.filter-btn');
  for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
  btn.classList.add('active');

  var list = document.getElementById('appointments-list');
  if (list) {
    list.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    list.style.opacity    = '0';
    list.style.transform  = 'translateY(8px)';
    setTimeout(function(){
      renderAppointments(filter);
      list.style.opacity   = '1';
      list.style.transform = 'translateY(0)';
    }, 200);
  }
}

/* ============================================================
   CANCEL MODAL
============================================================ */
function openCancelModal(id) {
  cancelTargetId = id;
  var modal = document.getElementById('cancel-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeModal() {
  var modal = document.getElementById('cancel-modal');
  if (modal) modal.classList.add('hidden');
  cancelTargetId = null;
}

async function confirmCancel() {
  if (cancelTargetId === null) return;
  try {
    await api('appointments/cancel.php', 'PUT', { id: cancelTargetId });
    showToast('Appointment cancelled', 'info');
    renderAppointments(currentFilter);
  } catch (err) {
    showToast(err.message, 'error');
  }
  closeModal();
}

var cancelModal = document.getElementById('cancel-modal');
if (cancelModal) {
  cancelModal.addEventListener('click', function(e){ if (e.target === this) closeModal(); });
}

/* ============================================================
   ADMIN PANEL
============================================================ */
function initAdmin() {
  var firstBtn = document.querySelector('.admin-nav-item');
  adminTab('overview', firstBtn);
}

async function adminTab(tab, btnEl) {
  var btns = document.querySelectorAll('.admin-nav-item');
  for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
  if (btnEl) btnEl.classList.add('active');

  var content = document.getElementById('admin-content');
  if (!content) return;

  content.style.opacity    = '0';
  content.style.transform  = 'translateY(10px)';
  content.style.transition = 'none';
  setTimeout(function(){
    content.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    content.style.opacity    = '1';
    content.style.transform  = 'translateY(0)';
  }, 80);

  content.innerHTML = '<div style="text-align:center;padding:60px;"><span class="spinner" style="border-color:var(--surface-3);border-top-color:var(--accent);width:28px;height:28px;"></span></div>';

  if (tab === 'overview')          await renderAdminOverview(content);
  if (tab === 'all-appointments')  await renderAdminAllAppts(content);
  if (tab === 'users')             await renderAdminUsers(content);
}

async function renderAdminOverview(content) {
  try {
    var sRes = await api('admin/stats.php');
    var aRes = await api('admin/appointments.php');
    var s    = sRes.stats;
    var appts= (aRes.appointments || []).slice(0, 8);

    var recentRows = '';
    for (var i = 0; i < appts.length; i++) {
      var a    = appts[i];
      var date = new Date(a.date + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
      var sl   = a.status.charAt(0).toUpperCase() + a.status.slice(1);
      recentRows +=
        '<tr>' +
          '<td style="color:var(--ink-muted);">#' + a.id + '</td>' +
          '<td><div class="user-cell"><div class="user-avatar">' + (a.userName||'?').charAt(0) + '</div><div class="user-name">' + (a.userName||'Unknown') + '</div></div></td>' +
          '<td>' + a.serviceIcon + ' ' + a.service + '</td>' +
          '<td>' + date + ' · ' + a.time + '</td>' +
          '<td><span class="mini-slot-badge badge-' + a.status + '">' + sl + '</span></td>' +
        '</tr>';
    }
    if (!recentRows) recentRows = '<tr><td colspan="5" style="text-align:center;color:var(--ink-muted);padding:32px;">No appointments yet</td></tr>';

    content.innerHTML =
      '<div class="stats-grid">' +
        '<div class="stat-card" style="animation:fadeUp 0.4s 0.05s both;"><div class="stat-label">Total Bookings</div><div class="stat-value">' + s.total + '</div><div class="stat-sub">All time</div></div>' +
        '<div class="stat-card" style="animation:fadeUp 0.4s 0.12s both;"><div class="stat-label">Pending</div><div class="stat-value" style="color:var(--warning);">' + s.pending + '</div><div class="stat-sub">Awaiting</div></div>' +
        '<div class="stat-card" style="animation:fadeUp 0.4s 0.19s both;"><div class="stat-label">Confirmed</div><div class="stat-value" style="color:var(--success);">' + s.confirmed + '</div><div class="stat-sub">Ready</div></div>' +
        '<div class="stat-card" style="animation:fadeUp 0.4s 0.26s both;"><div class="stat-label">Revenue</div><div class="stat-value" style="color:var(--accent);">$' + Number(s.revenue).toFixed(2) + '</div><div class="stat-sub">Non-cancelled</div></div>' +
      '</div>' +
      '<div class="data-table-wrapper" style="animation:fadeUp 0.45s 0.34s both;">' +
        '<div class="table-header"><div class="table-title">Recent Appointments</div></div>' +
        '<div style="overflow-x:auto;">' +
          '<table class="data-table">' +
            '<thead><tr><th>#ID</th><th>User</th><th>Service</th><th>Date & Time</th><th>Status</th></tr></thead>' +
            '<tbody>' + recentRows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';
  } catch (err) {
    content.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Error loading stats</h3><p>' + err.message + '</p></div>';
  }
}

async function renderAdminAllAppts(content) {
  content.innerHTML =
    '<div class="data-table-wrapper">' +
      '<div class="table-header">' +
        '<div class="table-title">All Appointments</div>' +
        '<div class="table-search"><input type="text" id="admin-search" placeholder="Search by name, service…" oninput="adminSearch(this.value)"/></div>' +
      '</div>' +
      '<div style="overflow-x:auto;">' +
        '<table class="data-table">' +
          '<thead><tr><th>#ID</th><th>User</th><th>Service</th><th>Date & Time</th><th>Price</th><th>Status</th><th>Action</th></tr></thead>' +
          '<tbody id="admin-appts-body"><tr><td colspan="7" style="text-align:center;padding:32px;"><span class="spinner" style="border-color:var(--surface-3);border-top-color:var(--accent);"></span></td></tr></tbody>' +
        '</table>' +
      '</div>' +
    '</div>';
  await loadAdminAppts('');
}

async function loadAdminAppts(search) {
  var body = document.getElementById('admin-appts-body');
  if (!body) return;
  try {
    var url = search ? 'admin/appointments.php?search=' + encodeURIComponent(search) : 'admin/appointments.php';
    var res = await api(url);
    var appts = res.appointments || [];
    if (!appts.length) {
      body.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--ink-muted);padding:32px;">No appointments found</td></tr>';
      return;
    }
    var html = '';
    for (var i = 0; i < appts.length; i++) {
      var a    = appts[i];
      var date = new Date(a.date + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
      html +=
        '<tr>' +
          '<td style="color:var(--ink-muted);">#' + a.id + '</td>' +
          '<td><div class="user-cell"><div class="user-avatar">' + (a.userName||'?').charAt(0) + '</div>' +
            '<div><div class="user-name">' + (a.userName||'Unknown') + '</div><div class="user-email">' + (a.userEmail||'') + '</div></div>' +
          '</div></td>' +
          '<td>' + a.serviceIcon + ' ' + a.service + '</td>' +
          '<td>' + date + '<br/><small style="color:var(--ink-muted);">' + a.time + '</small></td>' +
          '<td>$' + a.price + '</td>' +
          '<td><select class="status-select status-' + a.status + '" onchange="adminUpdateStatus(' + a.id + ',this)">' +
            '<option value="pending"'   + (a.status==='pending'   ?' selected':'') + '>Pending</option>' +
            '<option value="confirmed"' + (a.status==='confirmed' ?' selected':'') + '>Confirmed</option>' +
            '<option value="cancelled"' + (a.status==='cancelled' ?' selected':'') + '>Cancelled</option>' +
          '</select></td>' +
          '<td><button class="btn btn-sm btn-danger" onclick="adminDelete(' + a.id + ')">Delete</button></td>' +
        '</tr>';
    }
    body.innerHTML = html;
  } catch (err) {
    body.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--danger);padding:20px;">' + err.message + '</td></tr>';
  }
}

async function renderAdminUsers(content) {
  try {
    var res   = await api('admin/users.php');
    var users = res.users || [];
    var rows  = '';
    for (var i = 0; i < users.length; i++) {
      var u      = users[i];
      var joined = new Date(u.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
      var bg     = u.role==='admin' ? 'var(--warning-light)' : 'var(--accent-light)';
      var clr    = u.role==='admin' ? 'var(--warning)'       : 'var(--accent)';
      rows +=
        '<tr>' +
          '<td style="color:var(--ink-muted);">#' + u.id + '</td>' +
          '<td><div class="user-cell"><div class="user-avatar">' + u.name.charAt(0) + '</div>' +
            '<div><div class="user-name">' + u.name + '</div><div class="user-email">' + u.email + '</div></div>' +
          '</div></td>' +
          '<td><span class="pill" style="background:' + bg + ';color:' + clr + ';">' + (u.role==='admin'?'🛡️':'👤') + ' ' + u.role + '</span></td>' +
          '<td><strong>' + u.totalAppointments + '</strong></td>' +
          '<td style="color:var(--ink-muted);">' + joined + '</td>' +
        '</tr>';
    }
    if (!rows) rows = '<tr><td colspan="5" style="text-align:center;color:var(--ink-muted);padding:32px;">No users yet</td></tr>';

    content.innerHTML =
      '<div class="data-table-wrapper" style="animation:fadeUp 0.4s 0.05s both;">' +
        '<div class="table-header"><div class="table-title">Registered Users</div>' +
          '<span style="font-size:0.85rem;color:var(--ink-muted);">' + users.length + ' total</span>' +
        '</div>' +
        '<div style="overflow-x:auto;">' +
          '<table class="data-table">' +
            '<thead><tr><th>#ID</th><th>User</th><th>Role</th><th>Appointments</th><th>Joined</th></tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';
  } catch (err) {
    content.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Error loading users</h3><p>' + err.message + '</p></div>';
  }
}

async function adminUpdateStatus(id, selectEl) {
  var newStatus = selectEl.value;
  selectEl.disabled = true;
  try {
    await api('admin/appointments.php', 'PUT', { id: id, status: newStatus });
    selectEl.className = 'status-select status-' + newStatus;
    showToast('Status updated to ' + newStatus, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
  selectEl.disabled = false;
}

async function adminDelete(id) {
  if (!confirm('Delete this appointment permanently?')) return;
  try {
    await api('admin/appointments.php?id=' + id, 'DELETE');
    showToast('Appointment deleted', 'info');
    loadAdminAppts('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

var searchTimer;
function adminSearch(q) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function(){ loadAdminAppts(q); }, 350);
}

/* ============================================================
   INIT — page load හිදී session check කරනවා
============================================================ */
async function init() {
  try {
    var res = await api('auth/me.php');
    if (res.loggedIn && res.user) {
      currentUser = res.user;
    }
  } catch(e) {
    // session නැත — guest mode
  }
  updateNav();
}

// Enter key support
var lp = document.getElementById('login-pass');
if (lp) lp.addEventListener('keydown', function(e){ if(e.key==='Enter') doLogin(); });

var rp = document.getElementById('reg-pass2');
if (rp) rp.addEventListener('keydown', function(e){ if(e.key==='Enter') doRegister(); });

init();
