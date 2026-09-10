/**
 * Utility functions for parsing time slots, filtering schedules,
 * and checking room/lab availability from nested multi-department timetable data.
 */

export function parseTimeToMinutes(timeStr) {
  if (typeof timeStr !== 'string') {
    return Number.NaN;
  }

  let [hours, minutes] = timeStr.trim().split('.').map(Number);
  if (hours < 8) {
    hours += 12;
  }
  return hours * 60 + minutes;
}

export function parseTimeRange(rangeStr) {
  if (typeof rangeStr !== 'string' || !rangeStr.includes(' To ')) {
    return { start: Number.NaN, end: Number.NaN };
  }

  const [startStr, endStr] = rangeStr.split(' To ');
  return {
    start: parseTimeToMinutes(startStr),
    end: parseTimeToMinutes(endStr)
  };
}

export function isTimeInRange(targetTimeMinutes, rangeStr) {
  const { start, end } = parseTimeRange(rangeStr);
  return targetTimeMinutes >= start && targetTimeMinutes < end;
}

export function isLabClass(entry) {
  const subject = entry?.subject || '';
  const room = entry?.room || '';
  return subject.toLowerCase().includes('lab') || room.toLowerCase().includes('lab');
}

export function normalizeRoomName(roomName) {
  if (!roomName) {
    return '';
  }

  const room = roomName.replace(/^Lab\s*\/\s*/i, '').trim();

  if (room === 'Hall-3' || room === 'Hall-3 (First Floor)') {
    return 'Room No: 10 (Hall-3)';
  }

  if (room === 'Room No: 09') {
    return 'Room No: 09 (OGH)';
  }

  return room;
}

// Helper to extract all programs across departments
export function getAllPrograms(timetableData) {
  if (!timetableData) {
    return [];
  }

  const departments = Array.isArray(timetableData.departments)
    ? timetableData.departments
    : [{ name: timetableData.department || timetableData.institution || '', programs: timetableData.programs || [] }];

  const programs = [];
  departments.forEach(department => {
    (department.programs || []).forEach(program => {
      programs.push({
        department: department.name || '',
        ...program,
        classrooms: program.classrooms || {},
        schedule: Array.isArray(program.schedule)
          ? program.schedule.map(entry => ({
            ...entry,
            isLab: isLabClass(entry),
            room: normalizeRoomName(entry.room)
          }))
          : []
      });
    });
  });

  return programs;
}

// Returns all active classes across departments
export function getClassesAtTime(timetableData, day, targetTimeMinutes) {
  const activeClasses = [];
  const programs = getAllPrograms(timetableData);

  programs.forEach(program => {
    program.schedule.forEach(entry => {
      if (entry.day?.toLowerCase() === day.toLowerCase()) {
        if (isTimeInRange(targetTimeMinutes, entry.time)) {
          activeClasses.push({
            department: program.department,
            program: program.class,
            ...entry
          });
        }
      }
    });
  });

  return activeClasses;
}

// Gets schedule filtered by teacher initials or full name
export function getTeacherSchedule(timetableData, teacherQuery) {
  const teacherClasses = [];
  const query = teacherQuery.toLowerCase();
  const programs = getAllPrograms(timetableData);

  programs.forEach(program => {
    program.schedule.forEach(entry => {
      if (entry.teacher?.toLowerCase().includes(query)) {
        teacherClasses.push({
          department: program.department,
          program: program.class,
          ...entry
        });
      }
    });
  });

  return teacherClasses;
}

function getRoomNames(roomName) {
  const normalizedRoom = normalizeRoomName(roomName);
  const compositeMatch = normalizedRoom.match(/^(.*?No:\s*)(\d+(?:\/\d+)+)$/);

  if (!compositeMatch) {
    return normalizedRoom ? [normalizedRoom] : [];
  }

  const [, prefix, roomNumbers] = compositeMatch;
  return roomNumbers.split('/').map(roomNumber => `${prefix}${roomNumber}`);
}

// Checks room/lab availability status
export function getRoomOccupancyStatus(timetableData, day, timeRangeStr) {
  const targetRange = parseTimeRange(timeRangeStr);
  const programs = getAllPrograms(timetableData);

  const allRooms = new Set();
  programs.forEach(p => {
    Object.values(p.classrooms).forEach(room => {
      getRoomNames(room).forEach(roomName => allRooms.add(roomName));
    });

    p.schedule.forEach(entry => {
      getRoomNames(entry.room).forEach(roomName => allRooms.add(roomName));
    });
  });

  const statusMap = {};
  allRooms.forEach(room => {
    statusMap[room] = { status: 'FREE', occupiedBy: null };
  });

  programs.forEach(program => {
    program.schedule.forEach(entry => {
      if (entry.day?.toLowerCase() === day.toLowerCase()) {
        const entryRange = parseTimeRange(entry.time);
        if (targetRange.start < entryRange.end && targetRange.end > entryRange.start) {
          getRoomNames(entry.room).forEach(roomName => {
            statusMap[roomName] = {
              status: 'OCCUPIED',
              occupiedBy: {
                department: program.department,
                program: program.class,
                isLab: Boolean(entry.isLab),
                subject: entry.subject,
                teacher: entry.teacher,
                section: entry.section
              }
            };
          });
        }
      }
    });
  });

  return statusMap;
}