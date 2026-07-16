const SLA_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

export const IMPACT_TEXT_BY_SLA = {
  Critical: 'Server, database, or internet service is down and branch operation may stop.',
  High: 'Server, file storage, or network issue is blocking important work.',
  Medium: 'Work is affected but there is a workaround or the request is planned support.',
  Low: 'Routine request, preparation, consultation, or non-blocking assistance.',
};

const normalizeText = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');

export const normalizeSlaLevel = (value = 'Low') => {
  const normalized = normalizeText(value);
  const match = SLA_LEVELS.find((level) => normalizeText(level) === normalized);

  return match || 'Low';
};

const SLA_RULES = {
  Critical: {
    'Server / NAS / Database Support': ['Database or system connection issue'],
    'Network / Internet Support': ['No internet connection'],
  },
  High: {
    'Server / NAS / Database Support': ['Server access issue', 'NAS or file storage concern'],
    'Network / Internet Support': ['Slow internet', 'Network cable or port issue', 'Shared folder or server access issue'],
    'Printer Support': ['Passbook printer concern'],
  },
  Medium: {
    'Software / System Support': [
      'MBWin / Sky360 concern',
      'System error or application issue',
      'Software installation request',
      'Other software concern',
    ],
    'Account / Access Support': [
      'New user account request',
      'Password reset',
      'Login problem',
      'Access permission request',
      'Teller role / user role concern',
      'Other account access concern',
    ],
    'Computer / Laptop Support': [
      'Slow computer or laptop',
      'No display or no power',
      'Hardware issue',
      'Computer formatting',
      'Application installation',
      'Other computer concern',
    ],
    'Network / Internet Support': ['Wi-Fi connection issue', 'Other network concern'],
    'Biometric / Attendance Support': [
      'Unable to time-in or time-out',
      'Biometric device issue',
      'Attendance system concern',
      'Other biometric concern',
    ],
    'Server / NAS / Database Support': ['Backup concern', 'Other server concern'],
  },
  Low: {
    'Software / System Support': ['Excel / Office application concern'],
    'Printer Support': [
      'Printer not printing',
      'Printer setup or installation',
      'Poor print quality',
      'Printer error or blinking light',
      'Ink, paper jam, or maintenance concern',
      'Other printer concern',
    ],
    'Biometric / Attendance Support': ['Fingerprint enrollment'],
    'Other ICT Request': [
      'General ICT assistance',
      'ICT equipment request',
      'Technical consultation',
      'Concern not listed',
    ],
    Burnout: ['Helpdesk Burnout'],
  },
};

const findRuleSla = (supportCategory = '', concernType = '') => {
  const normalizedCategory = normalizeText(supportCategory);
  const normalizedConcern = normalizeText(concernType);

  if (!normalizedCategory || !normalizedConcern) return '';

  for (const level of ['Critical', 'High', 'Medium', 'Low']) {
    const categoryEntry = Object.entries(SLA_RULES[level]).find(
      ([category]) => normalizeText(category) === normalizedCategory
    );

    if (!categoryEntry) continue;

    const concerns = categoryEntry[1] || [];
    const hasConcern = concerns.some((concern) => normalizeText(concern) === normalizedConcern);

    if (hasConcern) return level;
  }

  return '';
};

const isOtherIctRequest = (supportCategory = '') => normalizeText(supportCategory) === 'other ict request';
const isBurnoutRequest = (supportCategory = '', concernType = '') =>
  normalizeText(supportCategory) === 'burnout' || normalizeText(concernType).includes('burnout');

const getFallbackSla = (supportCategory = '') => {
  if (!supportCategory) return '';
  if (isOtherIctRequest(supportCategory) || isBurnoutRequest(supportCategory)) return 'Low';

  return 'Medium';
};

const buildReason = ({ supportCategory, concernType, sla, fallback }) => {
  if (!supportCategory || !concernType) {
    return 'Select a support category and concern type to calculate the impact level.';
  }

  if (fallback) {
    return isOtherIctRequest(supportCategory)
      ? 'Other ICT requests are treated as routine assistance unless ICT reviews them as urgent.'
      : 'This concern type is not in the detailed rule list, so the system uses a conservative impact level.';
  }

  return `Basis: ${supportCategory} - ${concernType}. The level is set by the ICT impact rules.`;
};

export const deriveTicketImpact = ({
  supportCategory = '',
  concernType = '',
  deviceName = '',
  deviceType = '',
} = {}) => {
  const category = String(supportCategory || '').trim();
  const concern = String(concernType || '').trim();
  const device = String(deviceName || deviceType || '').trim();
  const burnout = isBurnoutRequest(category, concern) || normalizeText(device).includes('burnout');
  const normalizedCategory = burnout && !category ? 'Burnout' : category;
  const normalizedConcern = burnout && !concern ? 'Helpdesk Burnout' : concern;
  const ruleSla = findRuleSla(normalizedCategory, normalizedConcern);
  const fallback = !ruleSla;
  const sla = ruleSla || getFallbackSla(normalizedCategory) || 'Low';

  return {
    sla,
    priority: sla,
    impact: IMPACT_TEXT_BY_SLA[sla] || IMPACT_TEXT_BY_SLA.Low,
    reason: buildReason({
      supportCategory: normalizedCategory,
      concernType: normalizedConcern,
      sla,
      fallback,
    }),
    isReady: Boolean(normalizedCategory && normalizedConcern),
  };
};
