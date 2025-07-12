import dayjs from "dayjs";
import { logger } from "./logger";

export function formatDate(dateText: string, dateFormat?: string): string {
  try {
    if (!dateText || typeof dateText !== 'string') return '';
    let cleanedDateText = dateText.trim();
    cleanedDateText = cleanedDateText.replace(/[\[\](){}「」『』<>《》]/g, "");
    cleanedDateText = cleanedDateText.trim().replace(/^[\s\-_:：.,，。、]+|[\s\-_:：.,，。、]+$/g, "");
    if (!cleanedDateText) return '';
    if (!dateFormat) {
      try {
        const parsedDate = dayjs(cleanedDateText);
        if (parsedDate.isValid()) {
          return parsedDate.format();
        }
      } catch (error) {
        logger.warn(`标准日期解析失败: ${cleanedDateText}, 错误: ${(error as Error).message}`);
      }
      const chineseDatePatterns = [
        { regex: /(\d{1,2})月(\d{1,2})日/, handler: (matches: RegExpMatchArray) => {
          const month = parseInt(matches[1]) - 1;
          const day = parseInt(matches[2]);
          const currentYear = dayjs().year();
          return dayjs().year(currentYear).month(month).date(day);
        }},
        { regex: /(\d{4})年(\d{1,2})月(\d{1,2})日/, handler: (matches: RegExpMatchArray) => {
          const year = parseInt(matches[1]);
          const month = parseInt(matches[2]) - 1;
          const day = parseInt(matches[3]);
          return dayjs().year(year).month(month).date(day);
        }},
        { regex: /(\d{2})年(\d{1,2})月(\d{1,2})日/, handler: (matches: RegExpMatchArray) => {
          const year = 2000 + parseInt(matches[1]);
          const month = parseInt(matches[2]) - 1;
          const day = parseInt(matches[3]);
          return dayjs().year(year).month(month).date(day);
        }},
      ];
      for (const pattern of chineseDatePatterns) {
        try {
          const matches = cleanedDateText.match(pattern.regex);
          if (matches) {
            const result = pattern.handler(matches);
            if (result.isValid()) {
              return result.format();
            }
          }
        } catch (error) {
          logger.warn(`中文日期解析失败: ${cleanedDateText}, 错误: ${(error as Error).message}`);
        }
      }
      const relativeTimePatterns = [
        { regex: /(\d+)\s*分钟前/, handler: (matches: RegExpMatchArray) => dayjs().subtract(parseInt(matches[1]), 'minute') },
        { regex: /(\d+)\s*小时前/, handler: (matches: RegExpMatchArray) => dayjs().subtract(parseInt(matches[1]), 'hour') },
        { regex: /(\d+)\s*天前/, handler: (matches: RegExpMatchArray) => dayjs().subtract(parseInt(matches[1]), 'day') },
        { regex: /(\d+)\s*周前/, handler: (matches: RegExpMatchArray) => dayjs().subtract(parseInt(matches[1]), 'week') },
        { regex: /(\d+)\s*个月前/, handler: (matches: RegExpMatchArray) => dayjs().subtract(parseInt(matches[1]), 'month') },
        { regex: /昨天/, handler: () => dayjs().subtract(1, 'day') },
        { regex: /前天/, handler: () => dayjs().subtract(2, 'day') },
        { regex: /大前天/, handler: () => dayjs().subtract(3, 'day') },
        { regex: /上周/, handler: () => dayjs().subtract(1, 'week') },
        { regex: /上个月/, handler: () => dayjs().subtract(1, 'month') },
        { regex: /刚刚/, handler: () => dayjs() },
        { regex: /刚才/, handler: () => dayjs() },
        { regex: /(\d+)\s*minute(?:s)?\s*ago/, handler: (matches: RegExpMatchArray) => dayjs().subtract(parseInt(matches[1]), 'minute') },
        { regex: /(\d+)\s*hour(?:s)?\s*ago/, handler: (matches: RegExpMatchArray) => dayjs().subtract(parseInt(matches[1]), 'hour') },
        { regex: /(\d+)\s*day(?:s)?\s*ago/, handler: (matches: RegExpMatchArray) => dayjs().subtract(parseInt(matches[1]), 'day') },
        { regex: /(\d+)\s*week(?:s)?\s*ago/, handler: (matches: RegExpMatchArray) => dayjs().subtract(parseInt(matches[1]), 'week') },
        { regex: /(\d+)\s*month(?:s)?\s*ago/, handler: (matches: RegExpMatchArray) => dayjs().subtract(parseInt(matches[1]), 'month') },
        { regex: /yesterday/i, handler: () => dayjs().subtract(1, 'day') },
        { regex: /last\s*week/i, handler: () => dayjs().subtract(1, 'week') },
        { regex: /last\s*month/i, handler: () => dayjs().subtract(1, 'month') },
        { regex: /just\s*now/i, handler: () => dayjs() },
      ];
      for (const pattern of relativeTimePatterns) {
        try {
          const matches = cleanedDateText.match(pattern.regex);
          if (matches) {
            const result = pattern.handler(matches);
            if (result.isValid()) {
              return result.format();
            }
          }
        } catch (error) {
          logger.warn(`相对时间解析失败: ${cleanedDateText}, 错误: ${(error as Error).message}`);
        }
      }
      try {
        const timestamp = parseInt(cleanedDateText);
        if (!isNaN(timestamp)) {
          const date = timestamp > 1000000000 ? dayjs(timestamp * 1000) : dayjs(timestamp);
          if (date.isValid()) {
            return date.format();
          }
        }
      } catch (error) {
        logger.warn(`时间戳解析失败: ${cleanedDateText}, 错误: ${(error as Error).message}`);
      }
      return dateText;
    }
    try {
      const parsedDate = dayjs(cleanedDateText, dateFormat);
      if (parsedDate.isValid()) {
        return parsedDate.format();
      }
    } catch (error) {
      logger.warn(`指定格式日期解析失败: ${cleanedDateText}, 格式: ${dateFormat}, 错误: ${(error as Error).message}`);
    }
    return dateText;
  } catch (error) {
    logger.error(`日期格式化失败: ${dateText}, 错误: ${(error as Error).message}`);
    return dateText;
  }
} 