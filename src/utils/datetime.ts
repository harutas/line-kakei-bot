import _dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

_dayjs.extend(utc);
_dayjs.extend(timezone);

export const dayjs = _dayjs;
