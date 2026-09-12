const fs = require('fs');
const path = require('path');

function safePath(root, file) {
  const projectRoot = path.resolve(root);
  const target = path.resolve(projectRoot, file);

  if (
    target !== projectRoot &&
    !target.startsWith(projectRoot + path.sep)
  ) {
    throw new Error('Path outside project');
  }

  return target;
}

function listFiles(root, dir = root) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === 'node_modules' || entry.name === '.git') {
      return [];
    }

    const filePath = path.join(dir, entry.name);

    return entry.isDirectory()
      ? listFiles(root, filePath)
      : [path.relative(root, filePath)];
  });
}

function readFile(root, file) {
  return fs.readFileSync(
    safePath(root, file),
    'utf8'
  );
}

function writeFile(root, file, content) {
  const target = safePath(root, file);

  fs.mkdirSync(path.dirname(target), {
    recursive: true
  });

  fs.writeFileSync(
    target,
    content,
    'utf8'
  );

  return target;
}

function deleteFile(root, file) {
  const target = safePath(root, file);

  if (target === path.resolve(root)) {
    throw new Error('Cannot delete project root');
  }

  if (!fs.existsSync(target)) {
    throw new Error(`File does not exist: ${file}`);
  }

  const stat = fs.statSync(target);

  if (!stat.isFile()) {
    throw new Error(`Not a file: ${file}`);
  }

  fs.unlinkSync(target);

  return target;
}

function searchFiles(root, query) {
  return listFiles(root).filter(file => {
    try {
      return readFile(root, file).includes(query);
    } catch {
      return false;
    }
  });
}

function runCommand(root, command, args = []) {
  const {
    execFileSync,
    execSync
  } = require('child_process');

  if (args[0] === command) {
    args = args.slice(1);
  }

  if (
    !args.length &&
    /[\s|&;<>()$`]/.test(command)
  ) {
    return execSync(command, {
      cwd: root,
      encoding: 'utf8',
      shell: '/system/bin/sh'
    });
  }

  if (args.length) {
    return execFileSync(command, args, {
      cwd: root,
      encoding: 'utf8'
    });
  }

  return execFileSync(command, {
    cwd: root,
    encoding: 'utf8'
  });
}

module.exports = {
  listFiles,
  readFile,
  writeFile,
  deleteFile,
  searchFiles,
  runCommand
};
