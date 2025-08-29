import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import AdmZip from "adm-zip";
import { parseString } from "xml2js";
import * as cheerio from "cheerio";
import { Chapter } from "@feedhub/shared";

export interface EpubChapter {
  id: string;
  href: string;
  title: string;
  order: number;
}

export interface EpubMetadata {
  title?: string;
  creator?: string;
  description?: string;
  language?: string;
  identifier?: string;
}

export class EpubParser {
  private tempDir: string;
  private zip: AdmZip;
  private opfPath: string = "";
  private opfDir: string = "";

  constructor(private epubFilePath: string) {
    this.zip = new AdmZip(epubFilePath);
    this.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "epub-"));
  }

  /**
   * 解析EPUB文件
   */
  async parse(): Promise<{
    metadata: EpubMetadata;
    chapters: Omit<Chapter, "id" | "bookId" | "createdAt" | "updatedAt">[];
    coverUrl?: string;
  }> {
    try {
      // 1. 解压EPUB文件
      this.zip.extractAllTo(this.tempDir, true);

      // 2. 解析container.xml获取OPF文件路径
      await this.parseContainer();

      // 3. 解析OPF文件获取元数据和章节信息
      const { metadata, chapterList, manifest } = await this.parseOpf();

      // 4. 提取封面
      const coverUrl = await this.extractCover(manifest);

      // 5. 提取章节内容
      const chapters = await this.extractChapters(chapterList);

      return { metadata, chapters, coverUrl: coverUrl || undefined };
    } catch (error) {
      throw new Error(`EPUB解析失败: ${(error as Error).message}`);
    } finally {
      // 清理临时文件
      this.cleanup();
    }
  }

  /**
   * 解析container.xml文件
   */
  private async parseContainer(): Promise<void> {
    const containerPath = path.join(this.tempDir, "META-INF", "container.xml");

    if (!fs.existsSync(containerPath)) {
      throw new Error("无效的EPUB文件：缺少container.xml");
    }

    const containerXml = fs.readFileSync(containerPath, "utf-8");

    return new Promise((resolve, reject) => {
      parseString(containerXml, (err, result) => {
        if (err) {
          reject(new Error(`解析container.xml失败: ${err.message}`));
          return;
        }

        try {
          const rootfiles = result.container.rootfiles[0].rootfile;
          const opfFile = rootfiles.find(
            (rf: any) => rf.$["media-type"] === "application/oebps-package+xml"
          );

          if (!opfFile) {
            throw new Error("未找到OPF文件");
          }

          this.opfPath = path.join(this.tempDir, opfFile.$["full-path"]);
          this.opfDir = path.dirname(this.opfPath);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * 解析OPF文件
   */
  private async parseOpf(): Promise<{
    metadata: EpubMetadata;
    chapterList: EpubChapter[];
    manifest: any;
  }> {
    if (!fs.existsSync(this.opfPath)) {
      throw new Error("OPF文件不存在");
    }

    const opfXml = fs.readFileSync(this.opfPath, "utf-8");

    return new Promise((resolve, reject) => {
      parseString(opfXml, (err, result) => {
        if (err) {
          reject(new Error(`解析OPF文件失败: ${err.message}`));
          return;
        }

        try {
          const pkg = result.package;

          // 解析元数据
          const metadata = this.parseMetadata(pkg.metadata[0]);

          // 解析章节列表
          const chapterList = this.parseSpine(pkg.manifest[0], pkg.spine[0]);

          resolve({ metadata, chapterList, manifest: pkg.manifest[0] });
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * 解析元数据
   */
  private parseMetadata(metadata: any): EpubMetadata {
    const result: EpubMetadata = {};

    if (metadata["dc:title"]) {
      result.title = this.getTextContent(metadata["dc:title"][0]);
    }

    if (metadata["dc:creator"]) {
      result.creator = this.getTextContent(metadata["dc:creator"][0]);
    }

    if (metadata["dc:description"]) {
      result.description = this.getTextContent(metadata["dc:description"][0]);
    }

    if (metadata["dc:language"]) {
      result.language = this.getTextContent(metadata["dc:language"][0]);
    }

    if (metadata["dc:identifier"]) {
      result.identifier = this.getTextContent(metadata["dc:identifier"][0]);
    }

    return result;
  }

  /**
   * 提取封面图片
   */
  private async extractCover(manifest: any): Promise<string | null> {
    try {
      let coverItem: any = null;

      // 方法1: 查找meta标签中的cover引用
      if (manifest.item) {
        for (const item of manifest.item) {
          const attrs = item.$;
          if (attrs.properties && attrs.properties.includes('cover-image')) {
            coverItem = attrs;
            break;
          }
          if (attrs.id === 'cover' || attrs.id === 'cover-image') {
            coverItem = attrs;
            break;
          }
        }
      }

      // 方法2: 查找常见的封面文件名
      if (!coverItem && manifest.item) {
        const coverPatterns = ['cover', 'Cover', 'COVER', 'cover.jpg', 'cover.png', 'cover.jpeg'];
        for (const item of manifest.item) {
          const attrs = item.$;
          const href = attrs.href;
          if (href && coverPatterns.some(pattern => href.includes(pattern))) {
            if (attrs['media-type'] && attrs['media-type'].startsWith('image/')) {
              coverItem = attrs;
              break;
            }
          }
        }
      }

      if (!coverItem) {
        return null;
      }

      // 构建封面文件路径
      const coverPath = path.join(this.opfDir, coverItem.href);
      if (!fs.existsSync(coverPath)) {
        return null;
      }

      // 创建封面存储目录
      const uploadsDir = path.join(process.cwd(), 'uploads', 'covers');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // 生成唯一的封面文件名
      const ext = path.extname(coverItem.href);
      const coverFileName = `cover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
      const coverDestPath = path.join(uploadsDir, coverFileName);

      // 复制封面文件
      fs.copyFileSync(coverPath, coverDestPath);

      // 返回相对路径
      return `/uploads/covers/${coverFileName}`;
    } catch (error) {
      console.warn(`提取封面失败: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * 解析spine获取章节顺序
   */
  private parseSpine(manifest: any, spine: any): EpubChapter[] {
    const manifestItems: { [key: string]: any } = {};

    // 构建manifest映射
    if (manifest.item) {
      manifest.item.forEach((item: any) => {
        manifestItems[item.$.id] = item.$;
      });
    }

    const chapters: EpubChapter[] = [];

    if (spine.itemref) {
      spine.itemref.forEach((itemref: any, index: number) => {
        const idref = itemref.$.idref;
        const manifestItem = manifestItems[idref];

        if (manifestItem && manifestItem["media-type"] === "application/xhtml+xml") {
          chapters.push({
            id: idref,
            href: manifestItem.href,
            title: `第${index + 1}章`,
            order: index + 1,
          });
        }
      });
    }

    return chapters;
  }

  /**
   * 提取章节内容
   */
  private async extractChapters(
    chapterList: EpubChapter[]
  ): Promise<Omit<Chapter, "id" | "bookId" | "createdAt" | "updatedAt">[]> {
    const chapters: Omit<Chapter, "id" | "bookId" | "createdAt" | "updatedAt">[] = [];

    for (const chapter of chapterList) {
      try {
        const chapterPath = path.join(this.opfDir, chapter.href);

        if (!fs.existsSync(chapterPath)) {
          console.warn(`章节文件不存在: ${chapterPath}`);
          continue;
        }

        const htmlContent = fs.readFileSync(chapterPath, "utf-8");
        const $ = cheerio.load(htmlContent);

        // 提取标题（优先从h1-h6标签，否则使用默认标题）
        let title = chapter.title;
        const headingElement = $("h1, h2, h3, h4, h5, h6").first();
        if (headingElement.length > 0) {
          title = headingElement.text().trim() || title;
        }

        // 提取正文内容（保留HTML标签）
        const bodyElement = $("body");
        let content = "";

        if (bodyElement.length > 0) {
          // 移除script和style标签
          bodyElement.find("script, style").remove();
          content = bodyElement.html() || "";
        } else {
          // 如果没有body标签，提取整个文档内容
          $("script, style").remove();
          content = $.html();
        }

        // 计算字数（去除HTML标签后的文本长度）
        const textContent = $("<div>").html(content).text();
        const wordCount = textContent.length;

        chapters.push({
          chapterNumber: chapter.order,
          title: title,
          content: content,
          wordCount: wordCount,
          publishTime: new Date(),
          isNew: true,
        });
      } catch (error) {
        console.warn(`提取章节内容失败 ${chapter.href}: ${(error as Error).message}`);
      }
    }

    return chapters;
  }

  /**
   * 获取文本内容
   */
  private getTextContent(element: any): string {
    if (typeof element === "string") {
      return element;
    }
    if (element._) {
      return element._;
    }
    if (element.$text) {
      return element.$text;
    }
    return "";
  }

  /**
   * 清理临时文件
   */
  private cleanup(): void {
    try {
      if (fs.existsSync(this.tempDir)) {
        fs.rmSync(this.tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn(`清理临时文件失败: ${(error as Error).message}`);
    }
  }
}
