import _dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

_dayjs.extend(utc);
_dayjs.extend(timezone);
_dayjs.extend(isSameOrBefore);
_dayjs.extend(isSameOrAfter);

export const dayjs = _dayjs;

/**
 * 過去30日前の日時を取得（YYYY-MM-DDTHH:mm形式）
 * @param baseDate - 基準日（デフォルト: 今日のAsia/Tokyo時間）
 * @returns ISO日時文字列（YYYY-MM-DDTHH:mm）
 */
export const getMinPaymentDate = (baseDate?: Date): string => {
	const date = baseDate ? dayjs.tz(baseDate, 'Asia/Tokyo') : dayjs.tz(new Date(), 'Asia/Tokyo');
	return date.subtract(30, 'day').format('YYYY-MM-DDTHH:mm');
};

/**
 * 今日の日時を取得（YYYY-MM-DDTHH:mm形式）
 * @returns ISO日時文字列（YYYY-MM-DDTHH:mm）
 */
export const getTodayDate = (): string => {
	return dayjs.tz(new Date(), 'Asia/Tokyo').format('YYYY-MM-DDTHH:mm');
};

/**
 * 日付が有効な範囲内か検証（今日から過去30日間）
 * @param dateStr - ISO日時文字列（YYYY-MM-DDTHH:mm）
 * @returns 有効な場合true、無効な場合false
 */
export const isValidPaymentDate = (dateStr: string): boolean => {
	const date = dayjs.tz(dateStr, 'Asia/Tokyo');
	const today = dayjs.tz(new Date(), 'Asia/Tokyo');
	const minDate = today.subtract(30, 'day');

	return date.isValid() && date.isSameOrBefore(today, 'day') && date.isSameOrAfter(minDate, 'day');
};

/**
 * ISO日時文字列をDateオブジェクトに変換（Asia/Tokyoタイムゾーン）
 * @param dateStr - ISO日時文字列（YYYY-MM-DDTHH:mm）
 * @returns Dateオブジェクト
 */
export const parsePaymentDate = (dateStr: string): Date => {
	return dayjs.tz(dateStr, 'Asia/Tokyo').toDate();
};
