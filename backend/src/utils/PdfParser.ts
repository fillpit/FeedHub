import * as fs from "fs";
import pdf from "pdf-parse";
// 本地章节类型定义，替代已移除的共享 Chapter 类型
interface ParsedChapter {
  chapterNumber: number;
  title: string;
  content: string;
  wordCount: number;
  publishTime: Date;
  isNew: boolean;
}

export interface PdfMetadata {
  title?: string;
  author?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pages?: number;
}

export class PdfParser {
  constructor(private pdfFilePath: string) {}

  /**
   * 解析PDF文件
   */
  async parse(): Promise<{
    metadata: PdfMetadata;
    chapters: ParsedChapter[];
  }> {
    try {
      const dataBuffer = fs.readFileSync(this.pdfFilePath);
      const data = await pdf(dataBuffer);

      // 提取元数据
      const metadata = this.extractMetadata(data);

      // 提取章节内容
      const chapters = this.extractChapters(data);

      return { metadata, chapters };
    } catch (error) {
      throw new Error(`PDF解析失败: ${(error as Error).message}`);
    }
  }

  /**
   * 提取PDF元数据
   */
  private extractMetadata(data: any): PdfMetadata {
    const info = data.info || {};

    return {
      title: info.Title,
      author: info.Author,
      creator: info.Creator,
      producer: info.Producer,
      creationDate: info.CreationDate ? new Date(info.CreationDate) : undefined,
      modificationDate: info.ModDate ? new Date(info.ModDate) : undefined,
      pages: data.numpages,
    };
  }

  /**
   * 提取章节内容
   */
  private extractChapters(data: any): ParsedChapter[] {
    const text = data.text || "";
    const chapters: ParsedChapter[] = [];

    // 尝试通过常见的章节标记分割文本
    const chapterPatterns = [
      /第[\d一二三四五六七八九十百千万]+[章节]/g,
      /Chapter\s+\d+/gi,
      /CHAPTER\s+\d+/g,
      /第\s*[\d一二三四五六七八九十百千万]+\s*[章节]/g,
      /\n\s*\d+[\s\.]+/g, // 数字开头的行，可能是章节
    ];

    let matches: RegExpMatchArray[] = [];
    let usedPattern: RegExp | null = null;

    // 尝试不同的章节模式
    for (const pattern of chapterPatterns) {
      const currentMatches = [...text.matchAll(pattern)];
      if (currentMatches.length > 1) {
        // 至少要有2个匹配才认为是有效的章节分割
        matches = currentMatches;
        usedPattern = pattern;
        break;
      }
    }

    if (matches.length === 0) {
      // 如果没有找到章节标记，按页数或字数分割
      const wordsPerChapter = 3000; // 每章大约3000字
      const totalWords = text.length;
      const estimatedChapters = Math.max(1, Math.ceil(totalWords / wordsPerChapter));

      for (let i = 0; i < estimatedChapters; i++) {
        const startIndex = i * wordsPerChapter;
        const endIndex = Math.min((i + 1) * wordsPerChapter, totalWords);
        const chapterContent = text.substring(startIndex, endIndex);

        if (chapterContent.trim().length > 0) {
          chapters.push({
            chapterNumber: i + 1,
            title: `第${i + 1}章`,
            content: chapterContent.trim(),
            wordCount: chapterContent.length,
            publishTime: new Date(),
            isNew: true,
          });
        }
      }
    } else {
      // 根据找到的章节标记分割
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const startIndex = match.index!;
        const endIndex = i < matches.length - 1 ? matches[i + 1].index! : text.length;
        const chapterContent = text.substring(startIndex, endIndex);

        // 提取章节标题
        let title = match[0].trim();

        // 尝试从章节内容的前几行提取更好的标题
        const lines = chapterContent.split("\n").filter((line: string) => line.trim().length > 0);
        if (lines.length > 0) {
          const firstLine = lines[0].trim();
          if (firstLine.length < 100 && firstLine.length > title.length) {
            title = firstLine;
          }
        }

        chapters.push({
          chapterNumber: i + 1,
          title: title,
          content: chapterContent.trim(),
          wordCount: chapterContent.length,
          publishTime: new Date(),
          isNew: true,
        });
      }
    }

    // 如果没有提取到任何章节，创建一个默认章节
    if (chapters.length === 0) {
      chapters.push({
        chapterNumber: 1,
        title: "第一章",
        content: text.substring(0, Math.min(5000, text.length)), // 限制内容长度
        wordCount: text.length,
        publishTime: new Date(),
        isNew: true,
      });
    }

    return chapters;
  }
}
