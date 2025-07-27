// 共享的日期工具函数
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isBetween from "dayjs/plugin/isBetween";
import "dayjs/locale/zh-cn";

// 扩展dayjs插件
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.extend(isBetween);
dayjs.locale("zh-cn");

// 常用日期格式
export const DATE_FORMATS = {
  DATE: "YYYY-MM-DD",
  TIME: "HH:mm:ss",
  DATETIME: "YYYY-MM-DD HH:mm:ss",
  DATETIME_MINUTE: "YYYY-MM-DD HH:mm",
  ISO: "YYYY-MM-DDTHH:mm:ss.SSSZ",
  TIMESTAMP: "x",
  CHINESE_DATE: "YYYY年MM月DD日",
  CHINESE_DATETIME: "YYYY年MM月DD日 HH:mm:ss",
  MONTH_DAY: "MM-DD",
  YEAR_MONTH: "YYYY-MM",
};

// 日期工具类
export class DateUtils {
  /**
   * 格式化日期
   * @param date 日期
   * @param format 格式
   * @returns 格式化后的字符串
   */
  static format(date: dayjs.ConfigType, format: string = DATE_FORMATS.DATETIME): string {
    return dayjs(date).format(format);
  }

  /**
   * 获取相对时间
   * @param date 日期
   * @returns 相对时间字符串
   */
  static fromNow(date: dayjs.ConfigType): string {
    return dayjs(date).fromNow();
  }

  /**
   * 获取两个日期的差值
   * @param date1 日期1
   * @param date2 日期2
   * @param unit 单位
   * @returns 差值
   */
  static diff(
    date1: dayjs.ConfigType,
    date2: dayjs.ConfigType,
    unit: dayjs.UnitType = "millisecond"
  ): number {
    return dayjs(date1).diff(dayjs(date2), unit);
  }

  /**
   * 添加时间
   * @param date 日期
   * @param value 值
   * @param unit 单位
   * @returns 新日期
   */
  static add(date: dayjs.ConfigType, value: number, unit: dayjs.ManipulateType): dayjs.Dayjs {
    return dayjs(date).add(value, unit);
  }

  /**
   * 减去时间
   * @param date 日期
   * @param value 值
   * @param unit 单位
   * @returns 新日期
   */
  static subtract(date: dayjs.ConfigType, value: number, unit: dayjs.ManipulateType): dayjs.Dayjs {
    return dayjs(date).subtract(value, unit);
  }

  /**
   * 获取日期的开始时间
   * @param date 日期
   * @param unit 单位
   * @returns 开始时间
   */
  static startOf(date: dayjs.ConfigType, unit: dayjs.OpUnitType): dayjs.Dayjs {
    return dayjs(date).startOf(unit);
  }

  /**
   * 获取日期的结束时间
   * @param date 日期
   * @param unit 单位
   * @returns 结束时间
   */
  static endOf(date: dayjs.ConfigType, unit: dayjs.OpUnitType): dayjs.Dayjs {
    return dayjs(date).endOf(unit);
  }

  /**
   * 判断日期是否在指定范围内
   * @param date 日期
   * @param start 开始日期
   * @param end 结束日期
   * @returns 是否在范围内
   */
  static isBetween(
    date: dayjs.ConfigType,
    start: dayjs.ConfigType,
    end: dayjs.ConfigType
  ): boolean {
    return dayjs(date).isBetween(start, end);
  }

  /**
   * 判断是否是今天
   * @param date 日期
   * @returns 是否是今天
   */
  static isToday(date: dayjs.ConfigType): boolean {
    return dayjs(date).isSame(dayjs(), "day");
  }

  /**
   * 判断是否是昨天
   * @param date 日期
   * @returns 是否是昨天
   */
  static isYesterday(date: dayjs.ConfigType): boolean {
    return dayjs(date).isSame(dayjs().subtract(1, "day"), "day");
  }

  /**
   * 判断是否是本周
   * @param date 日期
   * @returns 是否是本周
   */
  static isThisWeek(date: dayjs.ConfigType): boolean {
    return dayjs(date).isSame(dayjs(), "week");
  }

  /**
   * 判断是否是本月
   * @param date 日期
   * @returns 是否是本月
   */
  static isThisMonth(date: dayjs.ConfigType): boolean {
    return dayjs(date).isSame(dayjs(), "month");
  }

  /**
   * 判断是否是本年
   * @param date 日期
   * @returns 是否是本年
   */
  static isThisYear(date: dayjs.ConfigType): boolean {
    return dayjs(date).isSame(dayjs(), "year");
  }

  /**
   * 获取时间戳
   * @param date 日期
   * @returns 时间戳
   */
  static timestamp(date: dayjs.ConfigType = dayjs()): number {
    return dayjs(date).valueOf();
  }

  /**
   * 从时间戳创建日期
   * @param timestamp 时间戳
   * @returns 日期对象
   */
  static fromTimestamp(timestamp: number): dayjs.Dayjs {
    return dayjs(timestamp);
  }

  /**
   * 获取UTC时间
   * @param date 日期
   * @returns UTC时间
   */
  static utc(date: dayjs.ConfigType = dayjs()): dayjs.Dayjs {
    return dayjs(date).utc();
  }

  /**
   * 转换时区
   * @param date 日期
   * @param timezone 时区
   * @returns 转换后的日期
   */
  static timezone(date: dayjs.ConfigType, timezone: string): dayjs.Dayjs {
    return dayjs(date).tz(timezone);
  }

  /**
   * 解析日期字符串
   * @param dateString 日期字符串
   * @param format 格式
   * @returns 日期对象
   */
  static parse(dateString: string, format?: string): dayjs.Dayjs {
    if (format) {
      return dayjs(dateString, format);
    }
    return dayjs(dateString);
  }

  /**
   * 验证日期是否有效
   * @param date 日期
   * @returns 是否有效
   */
  static isValid(date: dayjs.ConfigType): boolean {
    return dayjs(date).isValid();
  }

  /**
   * 获取友好的时间显示
   * @param date 日期
   * @returns 友好的时间字符串
   */
  static friendly(date: dayjs.ConfigType): string {
    const now = dayjs();
    const target = dayjs(date);
    const diffMinutes = now.diff(target, "minute");
    const diffHours = now.diff(target, "hour");
    const diffDays = now.diff(target, "day");

    if (diffMinutes < 1) {
      return "刚刚";
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else if (target.isSame(now, "year")) {
      return target.format("MM-DD HH:mm");
    } else {
      return target.format("YYYY-MM-DD");
    }
  }

  /**
   * 获取日期范围
   * @param start 开始日期
   * @param end 结束日期
   * @param unit 单位
   * @returns 日期数组
   */
  static range(
    start: dayjs.ConfigType,
    end: dayjs.ConfigType,
    unit: dayjs.ManipulateType = "day"
  ): dayjs.Dayjs[] {
    const startDate = dayjs(start);
    const endDate = dayjs(end);
    const dates: dayjs.Dayjs[] = [];
    let current = startDate;

    while (current.isBefore(endDate) || current.isSame(endDate)) {
      dates.push(current);
      current = current.add(1, unit);
    }

    return dates;
  }

  /**
   * 获取工作日
   * @param start 开始日期
   * @param end 结束日期
   * @returns 工作日数组
   */
  static getWorkdays(start: dayjs.ConfigType, end: dayjs.ConfigType): dayjs.Dayjs[] {
    return this.range(start, end).filter((date) => {
      const day = date.day();
      return day !== 0 && day !== 6; // 排除周日(0)和周六(6)
    });
  }

  /**
   * 获取周末
   * @param start 开始日期
   * @param end 结束日期
   * @returns 周末数组
   */
  static getWeekends(start: dayjs.ConfigType, end: dayjs.ConfigType): dayjs.Dayjs[] {
    return this.range(start, end).filter((date) => {
      const day = date.day();
      return day === 0 || day === 6; // 周日(0)和周六(6)
    });
  }
}

// 导出常用函数
export const formatDate = DateUtils.format;
export const fromNow = DateUtils.fromNow;
export const isToday = DateUtils.isToday;
export const isYesterday = DateUtils.isYesterday;
export const friendly = DateUtils.friendly;
export const timestamp = DateUtils.timestamp;
export const isValid = DateUtils.isValid;

// 默认导出
export default DateUtils;
