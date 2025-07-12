
export const checkScheduleOverlap = (newSchedule: any, existingSchedules: any[]) => {
  const otherSchedules = newSchedule.id
    ? existingSchedules.filter(s => s.id !== newSchedule.id)
    : existingSchedules;

  for (const existing of otherSchedules) {
    const new_start = newSchedule.start_time;
    const new_end = newSchedule.end_time;
    const existing_start = existing.start_time;
    const existing_end = existing.end_time;

    // Check for time overlap: (StartA < EndB) and (EndA > StartB)
    const timeOverlap = new_start < existing_end && new_end > existing_start;

    if (!timeOverlap) {
      continue; // No time overlap, so no conflict with this schedule
    }

    // At this point, we know times overlap. Now check date/day.
    const isNewRecurring = !!newSchedule.day_of_week;
    const isExistingRecurring = !!existing.day_of_week;

    if (isNewRecurring && isExistingRecurring) {
      if (newSchedule.day_of_week === existing.day_of_week) {
        return true; // Overlap: recurring on same day
      }
    } else if (!isNewRecurring && !isExistingRecurring) {
      if (newSchedule.date === existing.date) {
        return true; // Overlap: specific on same date
      }
    } else {
      // one is recurring, one is specific.
      const recurringSchedule = isNewRecurring ? newSchedule : existing;
      const specificSchedule = isNewRecurring ? existing : newSchedule;

      // getUTCDay() -> 0:Sun, 1:Mon, ..., 6:Sat
      // my day_of_week -> 1:Mon, ..., 7:Sun
      const specificDateDay = new Date(specificSchedule.date + 'T00:00:00').getUTCDay();
      const dayOfWeekForSpecificDate = specificDateDay === 0 ? 7 : specificDateDay;

      if (dayOfWeekForSpecificDate === recurringSchedule.day_of_week) {
        return true; // Overlap: specific date falls on a recurring day
      }
    }
  }

  return false; // No overlap found
};
