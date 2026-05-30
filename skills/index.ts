import * as ban from './moderation/ban.js';
import * as kick from './moderation/kick.js';
import * as warn from './moderation/warn.js';
import * as manageRoles from './moderation/manageRoles.js';
import * as fetchPrayerTimes from './utility/fetchPrayerTimes.js';
import * as searchHadith from './utility/searchHadith.js';

export const skills = {
  ban,
  kick,
  warn,
  manageRoles,
  fetchPrayerTimes,
  searchHadith,
};
