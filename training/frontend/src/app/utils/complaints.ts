import type { Penalty } from '../context/AppContext';

export const MAX_WORKER_PERCENT = 40;
export const COMPLAINT_THRESHOLD = 3;
export const COMPLAINT_PERCENT_DEDUCTION = 10;

type ComplaintWindow = Pick<Penalty, 'createdAt' | 'activeUntil' | 'revokedAt'>;

function clampPercent(value: number) {
  return Math.max(0, Math.min(MAX_WORKER_PERCENT, value));
}

function complaintEndAt(complaint: ComplaintWindow) {
  if (complaint.revokedAt && complaint.revokedAt < complaint.activeUntil) {
    return complaint.revokedAt;
  }
  return complaint.activeUntil;
}

export function isComplaintActive(complaint: ComplaintWindow, at = new Date()) {
  return complaint.createdAt <= at && at < complaintEndAt(complaint);
}

export function getComplaintPenaltyState(basePercent: number, complaints: Penalty[], at = new Date()) {
  const activeComplaints = complaints.filter((complaint) => isComplaintActive(complaint, at));
  const endTimes = activeComplaints
    .map((complaint) => complaintEndAt(complaint))
    .sort((left, right) => left.getTime() - right.getTime());
  const reductionActive = activeComplaints.length >= COMPLAINT_THRESHOLD;
  const reductionUntil = reductionActive ? endTimes[activeComplaints.length - COMPLAINT_THRESHOLD] : null;
  const normalizedBasePercent = clampPercent(basePercent);
  const effectivePercent = reductionActive
    ? Math.max(0, normalizedBasePercent - COMPLAINT_PERCENT_DEDUCTION)
    : normalizedBasePercent;

  return {
    activeComplaints,
    activeCount: activeComplaints.length,
    reductionActive,
    reductionUntil,
    basePercent: normalizedBasePercent,
    effectivePercent,
  };
}
