import prompts from 'prompts';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function main() {
  console.log('🚀 欢迎使用项目模版初始化脚本！\n');

  const questions = [
    {
      type: 'text',
      name: 'projectName',
      message: '请输入内部项目名称 (用于 package.json):',
      initial: 'my-new-project',
      format: val => val.toLowerCase().replace(/\s+/g, '-')
    },
    {
      type: 'text',
      name: 'siteTitle',
      message: '请输入网站显示标题 (Site Title):',
      initial: 'My Awesome Project'
    },
    {
      type: 'text',
      name: 'author',
      message: '请输入作者名称:',
      initial: 'Developer'
    },
    {
      type: 'text',
      name: 'adminEmail',
      message: '请输入管理员默认邮箱:',
      initial: 'admin@example.com'
    },
    {
      type: 'number',
      name: 'port',
      message: '请输入后端服务端口:',
      initial: 3001
    },
    {
      type: 'confirm',
      name: 'resetGit',
      message: '是否重置 Git 仓库 (删除 .git 并重新运行 git init)?',
      initial: true
    },
    {
      type: 'confirm',
      name: 'runInstall',
      message: '配置完成后是否自动运行 pnpm install?',
      initial: true
    }
  ];

  const response = await prompts(questions);

  if (!response.projectName || !response.siteTitle) {
    console.log('\n❌ 初始化已取消');
    process.exit(0);
  }

  // 1. 执行替换
  console.log('\n📝 正在更新项目配置...');
  
  const replacements = [
    { from: /nowen-note/g, to: response.siteTitle },
    { from: /node-template/g, to: response.projectName },
    { from: /admin@nowen-note\.local/g, to: response.adminEmail },
    { from: /3001/g, to: response.port.toString() },
    { from: /Antigravity/g, to: response.author },
    { from: /nowen-sidebar-width/g, to: `${response.projectName}-sidebar-width` },
    { from: /nowen-notelist-width/g, to: `${response.projectName}-notelist-width` },
  ];

  const filesToProcess = getFiles(rootDir);
  let updatedCount = 0;
  
  for (const file of filesToProcess) {
    try {
      let content = fs.readFileSync(file, 'utf8');
      let changed = false;
      
      for (const r of replacements) {
        if (r.from.test(content)) {
          content = content.replace(r.from, r.to);
          changed = true;
        }
      }
      
      if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`  ✅ 已更新: ${path.relative(rootDir, file)}`);
        updatedCount++;
      }
    } catch (err) {
      // 忽略无法读取的文件（如二进制文件误入）
    }
  }

  console.log(`\n✨ 完成！共更新了 ${updatedCount} 个文件。`);

  // 2. Git 重置
  if (response.resetGit) {
    console.log('\n🧹 正在重置 Git 仓库...');
    try {
      const gitDir = path.join(rootDir, '.git');
      if (fs.existsSync(gitDir)) {
        if (process.platform === 'win32') {
          execSync(`rmdir /s /q "${gitDir}"`, { stdio: 'ignore' });
        } else {
          execSync(`rm -rf "${gitDir}"`, { stdio: 'ignore' });
        }
      }
      execSync('git init', { cwd: rootDir, stdio: 'ignore' });
      execSync('git add .', { cwd: rootDir, stdio: 'ignore' });
      execSync('git commit -m "chore: initial commit from template"', { cwd: rootDir, stdio: 'ignore' });
      console.log('  ✅ Git 仓库已重置并完成首次提交');
    } catch (e) {
      console.warn('  ⚠️ Git 重置失败（可能是未安装 Git），已跳过。');
    }
  }

  // 3. 运行 pnpm install
  if (response.runInstall) {
    console.log('\n📦 正在更新依赖 (pnpm install)...');
    try {
      execSync('pnpm install', { cwd: rootDir, stdio: 'inherit' });
      console.log('  ✅ 依赖安装完成');
    } catch (e) {
      console.error('  ❌ 依赖安装过程中出现问题。');
    }
  }

  console.log('\n🎉 项目初始化成功！');
  console.log('👉 下一步: 运行 `pnpm dev` 开始开发。');
}

function getFiles(dir, allFiles = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      // 深度排除
      if (['node_modules', '.git', '.pnpm-store', 'dist', '.next', 'out', 'build', '.idea', '.vscode'].includes(file)) continue;
      getFiles(name, allFiles);
    } else {
      // 关键排除：脚本自身、Lock文件、二进制资源、日志等
      const ext = path.extname(file).toLowerCase();
      const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.woff', '.woff2', '.ttf', '.eot', '.zip', '.gz'];
      
      if (
        file === 'init.mjs' || 
        file === 'pnpm-lock.yaml' || 
        file === '.DS_Store' ||
        binaryExtensions.includes(ext)
      ) continue;
      
      allFiles.push(name);
    }
  }
  return allFiles;
}

main().catch(err => {
  console.error('\n💥 初始化脚本运行出错:', err);
  process.exit(1);
});
