const axios = require("axios");
const fs = require("fs");
const path = require("path");

// 配置
const BASE_URL = "http://localhost:8009";
const USERNAME = "admin";
const PASSWORD = "admin@123";

// 测试使用系统配置的OPDS服务器下载功能
async function testOpdsWithSystemConfig() {
  try {
    console.log("=== 开始测试系统配置的OPDS下载功能 ===");

    // 1. 登录系统获取token
    console.log("\n1. 登录系统...");
    const loginResponse = await axios.post(`${BASE_URL}/user/login`, {
      username: USERNAME,
      password: PASSWORD,
    });

    if (!loginResponse.data.success) {
      throw new Error(`登录失败: ${loginResponse.data.error}`);
    }

    const token = loginResponse.data.data.token;
    console.log("✅ 登录成功，获取到token");

    // 设置请求头
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // 2. 获取系统中已配置的OPDS服务器列表
    console.log("\n2. 获取系统OPDS配置...");
    const opdsConfigsResponse = await axios.get(`${BASE_URL}/book-rss/opds`, {
      headers,
    });

    if (!opdsConfigsResponse.data.success || !opdsConfigsResponse.data.data.list.length) {
      throw new Error("系统中没有配置OPDS服务器");
    }

    const opdsConfig = opdsConfigsResponse.data.data.list[0]; // 使用第一个配置
    console.log(`✅ 找到OPDS配置: ${opdsConfig.name} (${opdsConfig.url})`);

    // 3. 从OPDS服务器获取书籍列表
    console.log("\n3. 从OPDS服务器获取书籍列表...");
    const booksResponse = await axios.get(`${BASE_URL}/book-rss/opds/${opdsConfig.id}/books`, {
      headers,
    });

    if (!booksResponse.data.success || !booksResponse.data.data.books.length) {
      throw new Error("OPDS服务器没有返回书籍列表");
    }

    const books = booksResponse.data.data.books;
    console.log(`✅ 获取到 ${books.length} 本书籍`);

    // 打印前几本书的信息，查看数据结构
    console.log("\n📚 书籍列表预览:");
    books.slice(0, 3).forEach((book, index) => {
      console.log(`${index + 1}. ${book.title}`);
      console.log(`   作者: ${book.author || "未知"}`);
      console.log(`   下载链接: ${book.downloadUrl || book.url || "无"}`);
      console.log(`   所有字段:`, Object.keys(book));
    });

    // 这些是OPDS目录导航，我们需要选择一个分类来获取具体书籍
    const categoryToExplore = books.find((book) => book.sourceUrl && book.title.includes("热门"));
    if (!categoryToExplore) {
      throw new Error("没有找到可探索的书籍分类");
    }

    console.log(`📂 选择分类: ${categoryToExplore.title}`);
    console.log(`🔗 分类链接: ${categoryToExplore.sourceUrl}`);

    // 3.1. 获取分类下的具体书籍
    console.log("\n3.1. 获取分类下的具体书籍...");

    // 构建完整的URL
    let categoryUrl = categoryToExplore.sourceUrl;
    if (categoryUrl.startsWith("/")) {
      // 相对路径，需要拼接基础URL
      const baseUrl = new URL(opdsConfig.url);
      categoryUrl = `${baseUrl.protocol}//${baseUrl.host}${categoryUrl}`;
    }

    console.log(`🔗 完整分类链接: ${categoryUrl}`);

    // 使用OPDS配置中的认证信息
    const categoryBooksResponse = await axios.get(categoryUrl, {
      auth: {
        username: opdsConfig.username,
        password: opdsConfig.password,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    // 直接解析OPDS XML响应
    const xml2js = require("xml2js");
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(categoryBooksResponse.data);

    // 从OPDS XML中提取书籍信息
    const entries = result.feed?.entry || [];
    console.log(`✅ 在分类中找到 ${entries.length} 本书籍`);

    if (entries.length === 0) {
      throw new Error("分类中没有找到书籍");
    }

    // 查找第一本有EPUB下载链接的书籍
    let bookToDownload = null;
    let downloadUrl = null;

    for (const entry of entries.slice(0, 5)) {
      // 只检查前5本书
      const title = entry.title?.[0] || "未知标题";
      const author = entry.author?.[0]?.name?.[0] || "未知作者";
      const links = entry.link || [];

      console.log(`\n📖 检查书籍: ${title} by ${author}`);

      // 查找EPUB下载链接
      const epubLink = links.find(
        (link) =>
          link.$.type === "application/epub+zip" || (link.$.href && link.$.href.includes(".epub"))
      );

      if (epubLink) {
        bookToDownload = { title, author };
        downloadUrl = epubLink.$.href;

        // 如果是相对路径，转换为完整URL
        if (downloadUrl.startsWith("/")) {
          const baseUrl = new URL(opdsConfig.url);
          downloadUrl = `${baseUrl.protocol}//${baseUrl.host}${downloadUrl}`;
        }

        console.log(`✅ 找到EPUB下载链接: ${downloadUrl}`);
        break;
      } else {
        console.log(`❌ 没有找到EPUB下载链接`);
      }
    }

    if (!bookToDownload || !downloadUrl) {
      throw new Error("没有找到可下载的EPUB书籍");
    }

    console.log(`\n📖 选择下载书籍: ${bookToDownload.title} by ${bookToDownload.author}`);
    console.log(`📥 下载链接: ${downloadUrl}`);

    // 4. 添加OPDS书籍配置（触发下载）
    console.log("\n4. 添加OPDS书籍配置...");
    const addConfigResponse = await axios.post(
      `${BASE_URL}/book-rss/`,
      {
        name: `测试-${bookToDownload.title}`,
        title: bookToDownload.title,
        description: `从OPDS服务器下载的书籍：${bookToDownload.title} by ${bookToDownload.author}`,
        url: downloadUrl,
        type: "opds",
        enabled: true,
      },
      { headers }
    );

    if (!addConfigResponse.data.success) {
      throw new Error(`添加配置失败: ${addConfigResponse.data.error}`);
    }

    const configId = addConfigResponse.data.data.id;
    console.log(`✅ 配置添加成功，ID: ${configId}`);

    // 5. 等待下载完成
    console.log("\n5. 等待下载完成...");
    let downloadCompleted = false;
    let attempts = 0;
    const maxAttempts = 30; // 最多等待30次，每次2秒

    while (!downloadCompleted && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 等待2秒
      attempts++;

      try {
        const statusResponse = await axios.get(`${BASE_URL}/book-rss/${configId}`, {
          headers,
        });

        if (statusResponse.data.success) {
          const config = statusResponse.data.data;
          console.log(`⏳ 第${attempts}次检查 - 解析状态: ${config.parseStatus}`);

          if (config.parseStatus === "completed") {
            downloadCompleted = true;
            console.log("✅ 下载和解析完成！");
          } else if (config.parseStatus === "failed") {
            throw new Error("下载或解析失败");
          }
        }
      } catch (error) {
        console.log(`⚠️ 检查状态时出错: ${error.message}`);
      }
    }

    if (!downloadCompleted) {
      throw new Error("下载超时");
    }

    // 6. 查询书籍信息
    console.log("\n6. 查询下载的书籍信息...");
    const configResponse = await axios.get(`${BASE_URL}/book-rss/${configId}`, {
      headers,
    });

    if (!configResponse.data.success) {
      throw new Error("查询配置失败");
    }

    const config = configResponse.data.data;
    const bookId = config.bookId;

    if (!bookId) {
      throw new Error("配置中没有关联的书籍ID");
    }

    const bookResponse = await axios.get(`${BASE_URL}/book-rss/books/${bookId}`, {
      headers,
    });

    if (!bookResponse.data.success) {
      throw new Error("查询书籍信息失败");
    }

    const book = bookResponse.data.data;
    console.log("✅ 书籍信息:");
    console.log(`   标题: ${book.title}`);
    console.log(`   作者: ${book.author}`);
    console.log(`   来源: ${book.sourceType}`);
    console.log(`   路径: ${book.path}`);
    console.log(`   章节数: ${book.chapterCount}`);

    // 7. 检查文件是否存在
    console.log("\n7. 检查下载文件...");
    const filePath = book.path;
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`✅ 文件存在: ${filePath}`);
      console.log(`   文件大小: ${stats.size} 字节`);
    } else {
      console.log(`❌ 文件不存在: ${filePath}`);
    }

    // 8. 检查uploads/books目录
    console.log("\n8. 检查uploads/books目录内容...");
    const uploadsDir = path.join(__dirname, "backend", "uploads", "books");
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      console.log(`✅ uploads/books目录包含 ${files.length} 个文件:`);
      files.forEach((file) => {
        const fullPath = path.join(uploadsDir, file);
        const stats = fs.statSync(fullPath);
        console.log(`   ${file} (${stats.size} 字节)`);
      });
    } else {
      console.log("❌ uploads/books目录不存在");
    }

    console.log("\n🎉 系统配置OPDS下载功能测试完成！");
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
    if (error.response) {
      console.error("响应状态:", error.response.status);
      console.error("响应数据:", error.response.data);
    }
    process.exit(1);
  }
}

// 运行测试
testOpdsWithSystemConfig();
