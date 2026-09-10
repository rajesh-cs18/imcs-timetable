import {
  getAllPrograms,
  getClassesAtTime,
  getTeacherSchedule,
  getRoomOccupancyStatus,
  parseTimeRange,
  normalizeSubjectTitle,
  normalizeTeacherName
} from './scheduler.js';

let timetableData = null;
let liveStatusMode = 'live';

// Fetch JSON on initial startup
async function initApp() {
  try {
    const response = await fetch('../data/timetable.json');

    if (!response.ok) {
      throw new Error(`Failed to load timetable.json: ${response.status}`);
    }

    timetableData = await response.json();
    populateTeacherDropdown();
    populateProfileTeacherDropdown();
    populateProgramDropdown();
    populateProfileProgramDropdown();
    updateSectionControl();
    updateProfileSectionControl();
    setupTabSwitching();
    setupEventListeners();
    renderDashboard();
    renderRoomStatus();
    renderStudentSchedule();
    updateLiveStatus();
  } catch (err) {
    console.error('Failed to load timetable data:', err);
  }
}

// Dynamically extract unique teachers across all departments
function populateTeacherDropdown() {
  const teacherSelect = document.getElementById('teacher-select');

  if (!teacherSelect) {
    return;
  }

  const teachersSet = new Set();
  const programs = getAllPrograms(timetableData);

  programs.forEach(program => {
    program.schedule.forEach(entry => {
      if (entry.teacher) {
        teachersSet.add(normalizeTeacherName(entry.teacher));
      }
    });
  });

  const sortedTeachers = Array.from(teachersSet).sort();
  teacherSelect.innerHTML = '<option value="">-- Select Faculty Member --</option>';

  sortedTeachers.forEach(teacher => {
    const opt = document.createElement('option');
    opt.value = teacher;
    opt.textContent = teacher;
    teacherSelect.appendChild(opt);
  });
}

// Navigation Tabs
function setupTabSwitching() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const contentId = tab.getAttribute('data-tab');
      document.getElementById(contentId)?.classList.add('active');

      if (contentId === 'room-status') {
        renderRoomStatus();
      }
    });
  });
}

// Event Listeners for Filters
function setupEventListeners() {
  bindChange('dept-select', handleDepartmentChange);
  bindChange('class-select', renderStudentSchedule);
  bindChange('section-select', renderStudentSchedule);
  bindChange('teacher-select', renderTeacherSchedule);
  bindChange('day-select', renderRoomStatus);
  bindChange('time-slot-select', renderRoomStatus);
  bindClick('run-simulation-btn', runLiveStatusSimulation);
  bindClick('live-mode-btn', updateLiveStatus);
  bindClick('profile-faculty-btn', showFacultyProfile);
  bindClick('profile-student-btn', showStudentProfile);
  bindChange('profile-teacher-select', applyFacultyProfile);
  bindChange('profile-dept-select', handleProfileDepartmentChange);
  bindChange('profile-class-select', updateProfileSectionControl);
  bindClick('apply-student-profile-btn', applyStudentProfile);
}

function bindChange(elementId, listener) {
  document.getElementById(elementId)?.addEventListener('change', listener);
}

function bindClick(elementId, listener) {
  document.getElementById(elementId)?.addEventListener('click', listener);
}

function setActiveTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === tabId);
  });
}

function handleDepartmentChange() {
  populateProgramDropdown();
  updateSectionControl();
  renderStudentSchedule();
}

function populateProgramDropdown() {
  const departmentSelect = document.getElementById('dept-select');
  const classSelect = document.getElementById('class-select');

  if (!departmentSelect || !classSelect) {
    return;
  }

  populateProgramSelect(classSelect, departmentSelect.value, '-- Select Class --');
}

function populateProfileTeacherDropdown() {
  const sourceSelect = document.getElementById('teacher-select');
  const profileSelect = document.getElementById('profile-teacher-select');

  if (!sourceSelect || !profileSelect) {
    return;
  }

  profileSelect.innerHTML = sourceSelect.innerHTML;
}

function populateProfileProgramDropdown() {
  const departmentSelect = document.getElementById('profile-dept-select');
  const classSelect = document.getElementById('profile-class-select');

  if (!departmentSelect || !classSelect) {
    return;
  }

  populateProgramSelect(classSelect, departmentSelect.value, '-- Select Part --');
}

function populateProgramSelect(classSelect, selectedDepartment, placeholder) {
  const currentProgram = classSelect.value;
  const programs = getAllPrograms(timetableData)
    .filter(program => program.department === selectedDepartment)
    .map(program => program.class);

  classSelect.innerHTML = `<option value="">${placeholder}</option>`;
  programs.forEach(programName => {
    const option = document.createElement('option');
    option.value = programName;
    option.textContent = programName;
    classSelect.appendChild(option);
  });

  if (programs.includes(currentProgram)) {
    classSelect.value = currentProgram;
  }
}

function updateSectionControl() {
  const department = document.getElementById('dept-select')?.value;
  const sectionField = document.getElementById('section-field');
  const sectionSelect = document.getElementById('section-select');
  const showSection = department === 'Computer Science';

  sectionField?.classList.toggle('hidden', !showSection);

  if (!showSection && sectionSelect) {
    sectionSelect.value = '';
  }
}

function updateProfileSectionControl() {
  const department = document.getElementById('profile-dept-select')?.value;
  const sectionField = document.getElementById('profile-section-field');
  const sectionSelect = document.getElementById('profile-section-select');
  const showSection = department === 'Computer Science';

  sectionField?.classList.toggle('hidden', !showSection);

  if (!showSection && sectionSelect) {
    sectionSelect.value = '';
  }
}

function handleProfileDepartmentChange() {
  populateProfileProgramDropdown();
  updateProfileSectionControl();
}

function showFacultyProfile() {
  document.getElementById('faculty-profile-panel')?.classList.remove('hidden');
  document.getElementById('student-profile-panel')?.classList.add('hidden');
  document.getElementById('profile-faculty-btn')?.classList.add('active');
  document.getElementById('profile-student-btn')?.classList.remove('active');
}

function showStudentProfile() {
  document.getElementById('student-profile-panel')?.classList.remove('hidden');
  document.getElementById('faculty-profile-panel')?.classList.add('hidden');
  document.getElementById('profile-student-btn')?.classList.add('active');
  document.getElementById('profile-faculty-btn')?.classList.remove('active');
  populateProfileProgramDropdown();
  updateProfileSectionControl();
}

function applyFacultyProfile() {
  const teacherName = normalizeTeacherName(document.getElementById('profile-teacher-select')?.value || '');
  const teacherSelect = document.getElementById('teacher-select');

  if (!teacherName || !teacherSelect) {
    return;
  }

  teacherSelect.value = teacherName;
  setActiveTab('teacher-view');
  renderTeacherSchedule();
}

function applyStudentProfile() {
  const department = document.getElementById('profile-dept-select')?.value || 'Computer Science';
  const program = document.getElementById('profile-class-select')?.value || '';
  const section = document.getElementById('profile-section-select')?.value || '';

  if (!program) {
    return;
  }

  if (department === 'Computer Science' && !section) {
    return;
  }

  document.getElementById('dept-select').value = department;
  populateProgramDropdown();
  document.getElementById('class-select').value = program;
  updateSectionControl();

  if (department === 'Computer Science') {
    document.getElementById('section-select').value = section;
  }

  setActiveTab('student-view');
  renderStudentSchedule();
}

function getDepartmentBadge(department) {
  const badgeClass = department === 'Artificial Intelligence' ? 'ai' : 'cs';
  return `<span class="department-badge ${badgeClass}">${department}</span>`;
}

function getLabBadge(entry) {
  return entry?.isLab ? '<span class="class-type-badge">* Lab Class</span>' : '';
}

function getTrackLabel(section) {
  if (section === 'PM') {
    return 'Pre-Medical';
  }

  if (section === 'PE') {
    return 'Pre-Engineering';
  }

  if (section === 'PM/PE') {
    return 'Pre-Medical + Pre-Engineering';
  }

  return section || '';
}

function getProgramLabel(item) {
  const program = item.program || item.class || '';
  const track = item.department === 'Computer Science' ? getTrackLabel(item.section) : '';
  return track ? `${program} - ${track}` : program;
}

function getRoomSortNumber(roomName) {
  const match = roomName?.match(/Room No:\s*(\d+)/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function sortByRoomName(first, second) {
  const firstNumber = getRoomSortNumber(first);
  const secondNumber = getRoomSortNumber(second);

  if (firstNumber !== secondNumber) {
    return firstNumber - secondNumber;
  }

  return first.localeCompare(second);
}

function sortEntriesByRoom(first, second) {
  return sortByRoomName(first.room || '', second.room || '');
}

function getTeacherWorkloads() {
  const workloads = new Map();

  getAllPrograms(timetableData).forEach(program => {
    program.schedule.forEach(entry => {
      if (!entry.teacher) {
        return;
      }

      const teacher = normalizeTeacherName(entry.teacher);
      const subject = entry.subjectGroup || normalizeSubjectTitle(entry.subject);
      const workload = workloads.get(teacher) || {
        teacher,
        sessions: 0,
        subjects: new Set(),
        labs: 0
      };

      workload.sessions += 1;
      workload.subjects.add(subject);

      if (entry.isLab) {
        workload.labs += 1;
      }

      workloads.set(teacher, workload);
    });
  });

  return [...workloads.values()]
    .map(workload => ({
      ...workload,
      subjectCount: workload.subjects.size
    }))
    .sort((first, second) => second.sessions - first.sessions || first.teacher.localeCompare(second.teacher));
}

function renderDashboard() {
  const dashboardSummary = document.getElementById('dashboard-summary');

  if (!dashboardSummary) {
    return;
  }

  const programs = getAllPrograms(timetableData);
  const workloads = getTeacherWorkloads();
  const totalSessions = workloads.reduce((total, workload) => total + workload.sessions, 0);
  const totalLabSessions = workloads.reduce((total, workload) => total + workload.labs, 0);

  dashboardSummary.innerHTML = `
    <article class="dashboard-stat card">
      <p class="eyebrow">Programs</p>
      <strong>${programs.length}</strong>
      <span>CS and AI batches in the timetable</span>
    </article>
    <article class="dashboard-stat card">
      <p class="eyebrow">Faculty</p>
      <strong>${workloads.length}</strong>
      <span>Teachers assigned this semester</span>
    </article>
    <article class="dashboard-stat card">
      <p class="eyebrow">Total Periods</p>
      <strong>${totalSessions}</strong>
      <span>${totalLabSessions} lab periods marked separately</span>
    </article>
  `;
}

// Render Student Schedule
function renderStudentSchedule() {
  const departmentVal = document.getElementById('dept-select')?.value || 'Computer Science';
  const classVal = document.getElementById('class-select')?.value || '';
  const sectionVal = document.getElementById('section-select')?.value || '';
  const container = document.getElementById('student-schedule-results');

  if (!container) {
    return;
  }

  if (!classVal) {
    container.innerHTML = '<p>Please select a program.</p>';
    return;
  }

  if (departmentVal === 'Computer Science' && !sectionVal) {
    container.innerHTML = '<p>Please select Pre-Medical or Pre-Engineering track.</p>';
    return;
  }

  const programs = getAllPrograms(timetableData);
  const targetProgram = programs.find(p => {
    return p.department === departmentVal && p.class === classVal;
  });

  if (!targetProgram) {
    container.innerHTML = '<p>No data found.</p>';
    return;
  }

  let schedule = targetProgram.schedule;
  if (departmentVal === 'Computer Science') {
    schedule = schedule.filter(e => e.section === sectionVal || e.section === 'PM/PE');
  }

  const selectedTrack = departmentVal === 'Computer Science' ? ` - ${getTrackLabel(sectionVal)}` : '';
  let html = `<div class="card"><h3>${getDepartmentBadge(targetProgram.department)} ${targetProgram.class}${selectedTrack} Schedule</h3><br/>`;
  html += `<table border="1" cellpadding="8" style="border-collapse:collapse; width:100%;">
    <tr><th>Day</th><th>Time</th><th>Subject</th><th>Teacher</th><th>Room</th><th>Track</th></tr>`;

  schedule.forEach(item => {
    html += `<tr>
      <td>${item.day}</td>
      <td>${item.time}</td>
      <td>${item.subject} ${getLabBadge(item)}</td>
      <td>${item.teacher}</td>
      <td>${item.room}</td>
      <td>${targetProgram.department === 'Computer Science' ? getTrackLabel(item.section) : ''}</td>
    </tr>`;
  });

  html += `</table></div>`;
  container.innerHTML = html;
}

// Render Teacher Schedule
function renderTeacherSchedule() {
  const teacherVal = document.getElementById('teacher-select')?.value || '';
  const container = document.getElementById('teacher-schedule-results');

  if (!container) {
    return;
  }

  if (!teacherVal) {
    container.innerHTML = '<p>Please select a faculty member.</p>';
    return;
  }

  const results = getTeacherSchedule(timetableData, teacherVal);

  let html = `<div class="card"><h3>Schedule for ${teacherVal}</h3><br/>`;
  html += `<table border="1" cellpadding="8" style="border-collapse:collapse; width:100%;">
    <tr><th>Department</th><th>Program / Track</th><th>Day</th><th>Time</th><th>Subject</th><th>Room</th></tr>`;

  results.forEach(item => {
    html += `<tr>
      <td>${getDepartmentBadge(item.department)}</td>
      <td>${getProgramLabel(item)}</td>
      <td>${item.day}</td>
      <td>${item.time}</td>
      <td>${item.subject} ${getLabBadge(item)}</td>
      <td>${item.room}</td>
    </tr>`;
  });

  html += `</table></div>`;
  container.innerHTML = html;
}

// Render Room & Lab Availability Status
function renderRoomStatus() {
  const day = document.getElementById('day-select')?.value;
  const timeSlot = document.getElementById('time-slot-select')?.value;
  const container = document.getElementById('room-status-results');

  if (!container || !day || !timeSlot) {
    return;
  }

  const statusMap = getRoomOccupancyStatus(timetableData, day, timeSlot);

  let html = '';
  Object.keys(statusMap).sort(sortByRoomName).forEach(room => {
    const info = statusMap[room];
    const isFree = info.status === 'FREE';

    html += `
      <div class="status-card ${isFree ? 'free' : 'occupied'}">
        <h3>${room}</h3>
        <span class="status-tag">${info.status}</span>
        ${!isFree ? `
          <p><strong>Dept:</strong> ${getDepartmentBadge(info.occupiedBy.department)}</p>
          <p><strong>Program:</strong> ${getProgramLabel(info.occupiedBy)}</p>
          <p><strong>Subject:</strong> ${info.occupiedBy.subject} ${getLabBadge(info.occupiedBy)}</p>
          <p><strong>Teacher:</strong> ${info.occupiedBy.teacher}</p>
        ` : '<p>Room is available for use.</p>'}
      </div>
    `;
  });

  container.innerHTML = html;
}

// Live Status Clock Check
function updateLiveStatus() {
  liveStatusMode = 'live';
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const liveTimeBadge = document.getElementById('live-time-badge');
  if (liveTimeBadge) {
    liveTimeBadge.textContent = `Live: ${dayName} ${now.toLocaleTimeString()}`;
  }

  renderActiveClasses(dayName, currentMinutes);
}

function runLiveStatusSimulation() {
  const day = document.getElementById('simulation-day-select')?.value;
  const timeSlot = document.getElementById('simulation-time-slot-select')?.value;

  if (!day || !timeSlot) {
    return;
  }

  liveStatusMode = 'simulation';
  const { start } = parseTimeRange(timeSlot);
  const liveTimeBadge = document.getElementById('live-time-badge');
  if (liveTimeBadge) {
    liveTimeBadge.textContent = `Preview: ${day} ${timeSlot}`;
  }

  renderActiveClasses(day, start);
}

function renderActiveClasses(dayName, targetMinutes) {
  const activeClasses = getClassesAtTime(timetableData, dayName, targetMinutes);
  const container = document.getElementById('active-classes-list');

  if (!container) {
    return;
  }

  if (activeClasses.length === 0) {
    container.innerHTML = '<p>No classes currently in session.</p>';
    return;
  }

  let html = '';
  activeClasses.sort(sortEntriesByRoom).forEach(item => {
    html += `
      <div class="status-card occupied">
        <h3>${item.room}</h3>
        <p>${getDepartmentBadge(item.department)} <strong>${getProgramLabel(item)}</strong></p>
        <p><strong>Subject:</strong> ${item.subject} ${getLabBadge(item)}</p>
        <p><strong>Teacher:</strong> ${item.teacher}</p>
        <p><strong>Time:</strong> ${item.time}</p>
      </div>
    `;
  });

  container.innerHTML = html;
}

setInterval(() => {
  if (liveStatusMode === 'live') {
    updateLiveStatus();
  }
}, 60000);
document.addEventListener('DOMContentLoaded', initApp);