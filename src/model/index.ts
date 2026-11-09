// Public Model API for the Controller.
export { signIn, signUp } from './auth';
export type { AuthUser, SignUpInput, SignUpResult } from './auth';

export { getActiveMemberProfilesForGroup, getOwnProfile, saveOwnProfile } from './profiles';
export type { Profile } from './profiles';

export { createGroup, getGroupsForUser } from './groups';
export type { Group } from './groups';

export {
  admitGroupMember,
  getActiveMembersForGroup,
  getMembersForGroupIncludingInactive,
  isActiveGroupMember,
  leaveGroup,
  saveHostPositions,
  setHostingWillingness,
} from './memberships';
export type {
  AdmitGroupMemberInput,
  HostPositionChange,
  HostingWillingnessInput,
  LeaveGroupInput,
  LeaveGroupResult,
  Membership,
} from './memberships';

export {
  cancelSession,
  confirmSession,
  createSession,
  designateActualHost,
  getSessionParticipants,
  getSessionsForGroup,
  optOutOfSession,
  updateSession,
} from './sessions';
export type {
  CreateSessionInput,
  Session,
  SessionLocationInput,
  SessionWithLocation,
  UpdateSessionInput,
} from './sessions';
