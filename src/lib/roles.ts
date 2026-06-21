import type { Role } from '@/domain/types';

export const ROLE_LABEL: Record<Role, string> = {
  manager: 'Pyramid staff',
  organizer: 'Event organizer',
  attendee: 'Attendee',
};

export const ROLE_BLURB: Record<Role, string> = {
  manager: 'Manage spaces, boxes & inventory. Review event proposals — accept, decline, or reply.',
  organizer: 'Browse every room, describe your event and pick a date, then submit it for approval.',
  attendee: 'Browse the public event calendar and register to attend.',
};

/** Where each role lands after signing in. */
export function homeFor(role: Role): string {
  if (role === 'manager') return '/';
  if (role === 'organizer') return '/propose';
  return '/calendar';
}
