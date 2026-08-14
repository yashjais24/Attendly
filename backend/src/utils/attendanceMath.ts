// Logic to calculate how many classes can be skipped or are required
export function calculateAttendanceIntelligence(present: number, total: number, requiredPercentage: number) {
  const reqFrac = requiredPercentage / 100;
  
  if (total === 0) {
    return { canSkip: 0, requiredToRecover: 0, status: 'UNKNOWN' };
  }
  
  const currentPercentage = (present / total) * 100;
  
  if (currentPercentage >= requiredPercentage) {
    // How many more classes can we skip and stay >= reqFrac?
    // Math: (present) / (total + x) >= reqFrac => present >= reqFrac * total + reqFrac * x => x <= (present - reqFrac * total) / reqFrac
    let canSkip = 0;
    if (reqFrac > 0) {
      canSkip = Math.floor((present - reqFrac * total) / reqFrac);
    } else {
      // If required is 0, they can skip infinitely, but we cap or just return something large
      canSkip = 999; 
    }
    return { canSkip: Math.max(0, canSkip), requiredToRecover: 0, status: 'SAFE' };
  } else {
    // Below requirement, need to attend x consecutive classes
    // Math: (present + x) / (total + x) >= reqFrac => present + x >= reqFrac * total + reqFrac * x => x(1 - reqFrac) >= reqFrac * total - present
    let req = 0;
    if (reqFrac < 1) {
      req = Math.ceil((reqFrac * total - present) / (1 - reqFrac));
    } else {
      // 100% required but they are below. Impossible to recover to exactly 100% if they ever missed one.
      return { canSkip: 0, requiredToRecover: -1, status: 'IMPOSSIBLE' };
    }
    return { canSkip: 0, requiredToRecover: req, status: 'WARNING' };
  }
}
