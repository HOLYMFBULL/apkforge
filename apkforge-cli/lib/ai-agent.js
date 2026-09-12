const { showBanner } = require('./banner');
const readline = require('readline');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const {
  listFiles,
  readFile,
  writeFile,
  deleteFile,
  runCommand
} = require('./ai-tools');

const ui = require('./activity-ui');

async function startAgent(projectRoot, apiKey) {
  const root = path.resolve(projectRoot);
  const cliRoot = process.cwd();

  if (!apiKey) {
    throw new Error('AI API key is required.');
  }

  const ai = new GoogleGenAI({
    apiKey
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const config = {
    tools: [
      {
        functionDeclarations: [
          {
            name: 'list_files',
            description: 'List files in the APKForge project.',
            parameters: {
              type: 'OBJECT',
              properties: {},
              required: []
            }
          },

          {
            name: 'read_file',
            description: 'Read a project file.',
            parameters: {
              type: 'OBJECT',
              properties: {
                file: { type: 'STRING' }
              },
              required: ['file']
            }
          },

          {
            name: 'write_file',
            description:
              'Write or create a project source/configuration file.',
            parameters: {
              type: 'OBJECT',
              properties: {
                file: { type: 'STRING' },
                content: { type: 'STRING' }
              },
              required: ['file', 'content']
            }
          },

          {
            name: 'delete_file',
            description:
              'Delete a single project file. Only use when the user request requires removing a project file. Never delete the project directory.',
            parameters: {
              type: 'OBJECT',
              properties: {
                file: { type: 'STRING' }
              },
              required: ['file']
            }
          },

          {
            name: 'run_command',
            description:
              'Run a command in the APKForge project directory.',
            parameters: {
              type: 'OBJECT',
              properties: {
                command: { type: 'STRING' },
                args: {
                  type: 'ARRAY',
                  items: { type: 'STRING' }
                }
              },
              required: ['command']
            }
          },

          {
            name: 'build_project',
            description:
              'Build the APKForge project into a brand-new APK. Always use this tool for APKForge builds. It automatically invokes the local APKForge compiler with the correct project directory. Returns the complete compiler output, including errors.',
            parameters: {
              type: 'OBJECT',
              properties: {},
              required: []
            }
          }
        ]
      }
    ]
  };

  showBanner();
  console.log('────────────────────────────────────────');
  console.log(`Workspace: ${root}`);
  console.log('');
  console.log('Type your request. Type "exit" to quit.');
  console.log('');

  const ask = () => {
    rl.question('You: ', async input => {
      if (input.trim().toLowerCase() === 'exit') {
        rl.close();
        return;
      }

      ui.thinking('Analyzing your request...');

      try {
        const contents = [
          {
            role: 'user',
            parts: [
              {
                text:
`You are APKForge AI.

APKForge is strictly a source/files → brand-new APK compiler.

NEVER:
- edit an existing APK
- patch an existing APK
- decode an existing APK
- modify an existing APK
- rebuild an existing APK
- use APKTool
- use Smali patching
- use any globally installed APK compiler

PROJECT ROOT:
${root}

BUILD RULE:
For every APKForge build, ALWAYS call the dedicated build_project tool.

Do NOT construct the compiler command yourself.

Before building, inspect the relevant project files and configuration.

BUILD ERROR RECOVERY:
After running the build, inspect the complete compiler output.

If the compiler fails:

1. Determine whether it is a source/configuration problem or a tool/environment problem.
2. Identify the file and relevant line.
3. Read the relevant file.
4. Diagnose the smallest necessary correction.
5. Edit only the necessary file(s).
6. Run build_project again.
7. Repeat the inspect → diagnose → minimal fix → rebuild cycle when appropriate.
8. Stop only after success or a genuine external/toolchain blocker.

Never modify an existing APK.
Never use APKTool or Smali.

FILE DELETION:
Use delete_file only when the user's request requires removing a project file.
Never delete the project root.
Never delete files outside the project.

REPORTING:
At the end report:
- whether the build succeeded
- exact files edited
- what changed and why
- number of build attempts
- final APK path if successful

USER REQUEST:
${input}`
              }
            ]
          }
        ];

        while (true) {
          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents,
            config
          });

          const parts =
            response.candidates?.[0]?.content?.parts || [];

          const calls = parts.filter(part => part.functionCall);

          if (!calls.length) {
            console.log('');
            console.log('AI:', response.text || '');
            console.log('');
            break;
          }

          contents.push(response.candidates[0].content);

          for (const part of calls) {
            const call = part.functionCall;

            let result;

            try {
              if (call.name === 'list_files') {
                ui.searching('Searching the project files...');

                result = {
                  files: listFiles(root)
                };

              } else if (call.name === 'read_file') {
                const content = readFile(root, call.args.file);

                ui.reading(call.args.file);

                await ui.showCodeWriting(
                  'reading',
                  call.args.file,
                  content
                );

                result = {
                  content
                };

              } else if (call.name === 'write_file') {
                const fs = require('fs');
                const path = require('path');

                const target = path.resolve(root, call.args.file);
                const exists = fs.existsSync(target);

                if (exists) {
                  await ui.showCodeWriting(
                    'editing',
                    call.args.file,
                    call.args.content
                  );
                } else {
                  await ui.showCodeWriting(
                    'creating',
                    call.args.file,
                    call.args.content
                  );
                }

                result = {
                  path: writeFile(
                    root,
                    call.args.file,
                    call.args.content
                  )
                };

                ui.success(
                  exists
                    ? `Updated ${call.args.file}`
                    : `Created ${call.args.file}`
                );

              } else if (call.name === 'delete_file') {
                ui.deleting(call.args.file);

                result = {
                  path: deleteFile(
                    root,
                    call.args.file
                  )
                };

              } else if (call.name === 'run_command') {
                const command = call.args.command;
                const args = call.args.args || [];

                ui.running(
                  [command, ...args].join(' ')
                );

                result = {
                  output: runCommand(
                    root,
                    command,
                    args
                  )
                };

              } else if (call.name === 'build_project') {
                ui.building(
                  'Building APKForge project...'
                );

                try {
                  result = {
                    success: true,
                    output: runCommand(
                      cliRoot,
                      'node',
                      [
                        'bin/apkforge.js',
                        'build',
                        root
                      ]
                    )
                  };

                  ui.success(
                    'APK build completed successfully.'
                  );

                } catch (error) {
                  result = {
                    success: false,
                    output:
                      (error.stdout || '') +
                      (error.stderr || '') ||
                      error.message
                  };

                  ui.error(
                    'APK build failed.'
                  );
                }

              } else {
                result = {
                  error: `Unknown tool: ${call.name}`
                };
              }

            } catch (error) {
              result = {
                error: error.message
              };

              ui.error(
                `${call.name}: ${error.message}`
              );
            }

            contents.push({
              role: 'user',
              parts: [
                {
                  functionResponse: {
                    name: call.name,
                    response: result,
                    id: call.id
                  }
                }
              ]
            });
          }
        }

      } catch (error) {
        ui.error(`AI error: ${error.message}`);
      }

      ask();
    });
  };

  ask();
}

if (require.main === module) {
  const project = process.argv[2];
  const apiKey = process.env.GEMINI_API_KEY;

  if (!project) {
    console.error('Usage: node lib/ai-agent.js <project>');
    process.exit(1);
  }

  if (!apiKey) {
    console.error('AI API key is not configured.');
    process.exit(1);
  }

  startAgent(project, apiKey);
}

module.exports = {
  startAgent
};
