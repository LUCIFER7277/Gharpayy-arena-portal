import fs from 'fs';
import path from 'path';

function findUnusedFiles(srcDir) {
  const allFiles = [];
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        scanDir(fullPath);
      } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
        allFiles.push(fullPath);
      }
    }
  }
  scanDir(srcDir);

  const fileContents = allFiles.map(f => ({
    path: f,
    content: fs.readFileSync(f, 'utf8')
  }));

  const unusedFiles = [];
  for (const file of allFiles) {
    const isRootOrRoute = file.includes('\\routes\\') || file.includes('/routes/') || file.includes('main.tsx') || file.includes('routeTree.gen.ts');
    if (isRootOrRoute) continue;

    const basename = path.basename(file, path.extname(file));
    let isUsed = false;
    for (const other of fileContents) {
      if (other.path === file) continue;
      // Check if basename is imported or used
      if (other.content.includes(basename)) {
        isUsed = true;
        break;
      }
    }
    if (!isUsed) {
      unusedFiles.push(file);
    }
  }

  console.log("Potentially unused files:");
  unusedFiles.forEach(f => console.log(f));
}

findUnusedFiles(path.join(process.cwd(), 'src'));
