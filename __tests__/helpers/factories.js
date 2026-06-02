export function makeProgram(overrides = {}) {
  return {
    id: 'test-program-id',
    splitType: 'upper_lower',
    trainingAge: 'intermediate',
    daysPerWeek: 4,
    startDate: new Date('2026-01-06').toISOString(),
    currentBlock: 1,
    currentWeek: 1,
    splitDays: [
      {
        dayLabel: 'Upper A',
        exercises: [
          { exerciseId: 'incline_smith_press',      sets: 2, repRange: [5, 7],   rpe: 8,  addedAt: new Date('2026-01-06').toISOString() },
          { exerciseId: 'chest_supported_row_wide', sets: 2, repRange: [7, 10],  rpe: 10, addedAt: new Date('2026-01-06').toISOString() },
          { exerciseId: 'cable_lateral_raise',      sets: 2, repRange: [8, 12],  rpe: 9,  addedAt: new Date('2026-01-06').toISOString() },
          { exerciseId: 'incline_bicep_curl',       sets: 2, repRange: [8, 12],  rpe: 10, addedAt: new Date('2026-01-06').toISOString() },
        ],
      },
      {
        dayLabel: 'Lower A',
        exercises: [
          { exerciseId: 'hack_squat',            sets: 2, repRange: [5, 7],  rpe: 8, addedAt: new Date('2026-01-06').toISOString() },
          { exerciseId: 'seated_hamstring_curl', sets: 2, repRange: [7, 11], rpe: 9, addedAt: new Date('2026-01-06').toISOString() },
          { exerciseId: 'leg_extension',         sets: 2, repRange: [6, 9],  rpe: 9, addedAt: new Date('2026-01-06').toISOString() },
        ],
      },
    ],
    createdAt: new Date('2026-01-06').toISOString(),
    updatedAt: new Date('2026-01-06').toISOString(),
    ...overrides,
  };
}

export function makeSession(exerciseId, sets, dateString, discomfortRating = 1) {
  return {
    id: `session-${Math.random()}`,
    date: dateString,
    splitDayLabel: 'Upper A',
    startTime: dateString,
    endTime: dateString,
    exercises: [{ exerciseId, discomfortRating, sets }],
  };
}

export function makeSets(weight, reps, rpe = 8, count = 2) {
  return Array.from({ length: count }, () => ({
    weight: String(weight),
    reps: String(reps),
    rpe,
    completedAt: new Date().toISOString(),
  }));
}

export function makeCheckIn(nutritionRating, weekStartDate) {
  return {
    weekStartDate,
    nutritionRating,
    completedAt: new Date().toISOString(),
  };
}
