const RESET = '\x1b[0m';

const COLORS = {
  thinking: '\x1b[35m',
  reading: '\x1b[34m',
  editing: '\x1b[33m',
  writing: '\x1b[36m',
  creating: '\x1b[32m',
  deleting: '\x1b[31m',
  searching: '\x1b[34m',
  running: '\x1b[38;5;208m',
  building: '\x1b[35m',
  success: '\x1b[32m',
  error: '\x1b[31m'
};

const ICONS = {
  thinking: '🧠',
  reading: '📖',
  editing: '✏️',
  writing: '📝',
  creating: '➕',
  deleting: '🗑️',
  searching: '🔎',
  running: '⚙️',
  building: '🏗️',
  success: '✓',
  error: '❌'
};

function activity(type, message, details = []) {
  const color = COLORS[type] || '';
  const icon = ICONS[type] || '•';

  console.log('');
  console.log(`${color}${icon} ${type.toUpperCase()}${RESET}`);
  console.log(message);

  if (Array.isArray(details)) {
    for (const line of details) {
      console.log(line);
    }
  }

  console.log('');
}

function thinking(message = 'Analyzing request...') {
  activity('thinking', message);
}

function reading(file) {
  activity('reading', file);
}

function editing(file) {
  activity('editing', file);
}

function writing(file) {
  activity('writing', file);
}

function creating(file) {
  activity('creating', file);
}

function deleting(file) {
  activity('deleting', file);
}

function searching(message) {
  activity('searching', message);
}

function running(command) {
  activity('running', command);
}

function building(message = 'Building APKForge project...') {
  activity('building', message);
}

function success(message) {
  activity('success', message);
}

function error(message) {
  activity('error', message);
}


/*
 * Live terminal code writer
 *
 * Shows the actual content being written instead of
 * displaying an old/new diff.
 */
async function showCodeWriting(type, file, content) {
  const color = COLORS[type] || COLORS.writing;
  const icon = ICONS[type] || ICONS.writing;

  const lines = String(content).split('\n');

  console.log('');
  console.log(`${color}${icon} ${type.toUpperCase()}${RESET}`);
  console.log(file);
  console.log('');

  console.log('┌──────────────────────────────────────────────────────────────┐');

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = String(i + 1).padStart(3, ' ');
    const line = lines[i];

    // Show the current line with one cursor.
    process.stdout.write(
      `│ ${lineNumber} │ ${line}█`
    );

    // Small typing pause.
    await new Promise(resolve => setTimeout(resolve, 10));

    // Remove the cursor from the completed line.
    process.stdout.write('\b \b\n');
  }

  console.log('└──────────────────────────────────────────────────────────────┘');
  console.log('');
}

async function typeText(text, speed = 7) {
  const value = String(text || '');

  process.stdout.write('AI: ');

  for (const char of value) {
    process.stdout.write(char);

    if (char === '\n') {
      continue;
    }

    await new Promise(resolve => setTimeout(resolve, speed));
  }

  process.stdout.write('\n\n');
}


module.exports = {
  activity,
  thinking,
  reading,
  editing,
  writing,
  creating,
  deleting,
  searching,
  running,
  building,
  success,
  error,
  showCodeWriting,
  typeText
};
