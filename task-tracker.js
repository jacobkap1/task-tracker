const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const filePath = path.join(__dirname, 'tasks.json');

// Initialize tasks file if not exists
if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
}

// Load tasks
function loadTasks() {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

// Save tasks
function saveTasks(tasks) {
    fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2));
}

// Parse CLI arguments for options like --priority and --due
function parseArgs(args) {
    const options = {};
    const rest = [];

    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--priority=')) {
            options.priority = args[i].split('=')[1].toLowerCase();
        } else if (args[i].startsWith('--due=')) {
            options.dueDate = args[i].split('=')[1];
        } else if (args[i].startsWith('--sort=')) {
            options.sort = args[i].split('=')[1];
        } else {
            rest.push(args[i]);
        }
    }

    return { taskText: rest.join(' '), options };
}

const args = process.argv.slice(2);
const command = args[0];
const rawParams = args.slice(1);

switch (command) {
    case 'add': {
        const { taskText, options } = parseArgs(rawParams);

        if (!taskText) {
            console.log(chalk.red('Please provide a task description.'));
            break;
        }

        const tasks = loadTasks();
        tasks.push({
            id: Date.now(),
            text: taskText,
            done: false,
            priority: options.priority || 'medium',
            dueDate: options.dueDate || null
        });

        saveTasks(tasks);
        console.log(chalk.green(`Task added: "${taskText}"`));
        break;
    }

    case 'list': {
        let tasks = loadTasks();

        if (tasks.length === 0) {
            console.log(chalk.yellow('No tasks found.'));
            break;
        }

        // Sorting by priority if requested
        const sortArg = rawParams.find(param => param.startsWith('--sort='));
        const sortBy = sortArg ? sortArg.split('=')[1] : null;

        if (sortBy === 'priority') {
            const priorityOrder = { high: 1, medium: 2, low: 3 };
            tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        }

        // Get today's date as a string in YYYY-MM-DD format
        const today = new Date();
        const todayString = today.getFullYear() + '-' + 
                           String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(today.getDate()).padStart(2, '0');

        tasks.forEach(task => {
            let dueInfo = 'No due date';

            if (task.dueDate) {
                // Parse the due date properly
                const dueDateObj = new Date(task.dueDate + 'T00:00:00'); // Force local midnight
                const today = new Date();
                
                // Normalize today to midnight for comparison
                today.setHours(0, 0, 0, 0);

                if (dueDateObj < today) {
                    dueInfo = chalk.red(`⚠️ Overdue (Due: ${task.dueDate})`);
                } else if (dueDateObj.getTime() === today.getTime()) {
                    dueInfo = chalk.yellow(`📅 Due Today!`);
                } else {
                    dueInfo = chalk.magenta(`🗓️ Upcoming (Due: ${task.dueDate})`);
                }
            }

            const fullText = `Task: ${task.text} (ID: ${task.id})\n   Priority: ${task.priority} | ${dueInfo}`;

            if (task.done) {
                console.log(chalk.green(fullText));
            } else {
                console.log(fullText);
            }
        });
        break;
    }

    case 'done': {
        const id = parseInt(rawParams[0]);
        if (isNaN(id)) {
            console.log(chalk.red('Please provide a valid task ID.'));
            break;
        }

        const tasks = loadTasks();
        const task = tasks.find(t => t.id === id);

        if (!task) {
            console.log(chalk.red(`Task with ID ${id} not found.`));
            break;
        }

        task.done = true;
        saveTasks(tasks);
        console.log(chalk.green(`Marked as done: "${task.text}"`));
        break;
    }

    case 'remove': {
        const id = parseInt(rawParams[0]);
        if (isNaN(id)) {
            console.log(chalk.red('Please provide a valid task ID.'));
            break;
        }

        let tasks = loadTasks();
        const before = tasks.length;
        tasks = tasks.filter(t => t.id !== id);

        if (tasks.length === before) {
            console.log(chalk.red(`No task found with ID ${id}.`));
        } else {
            saveTasks(tasks);
            console.log(chalk.green(`Removed task with ID ${id}.`));
        }
        break;
    }

    case 'clear': {
        saveTasks([]);
        console.log(chalk.green('All tasks cleared.'));
        break;
    }

    case 'edit': {
        const id = parseInt(rawParams[0]);
        const newDescription = rawParams.slice(1).join(' ');

        if (isNaN(id)) {
            console.log(chalk.red('Please provide a valid task ID.'));
            break;
        }

        if (!newDescription) {
            console.log(chalk.red('Please provide the new task description.'));
            break;
        }

        const tasks = loadTasks();
        const task = tasks.find(t => t.id === id);

        if (!task) {
            console.log(chalk.red(`Task with ID ${id} not found.`));
            break;
        }

        task.text = newDescription;
        saveTasks(tasks);
        console.log(chalk.green(`Task ID ${id} updated to: "${newDescription}"`));
        break;
    }

    default:
        console.log(chalk.yellow('Unknown command. Use one of the following:'));
        console.log('  add <task> [--priority=low|medium|high] [--due=YYYY-MM-DD]');
        console.log('  list [--sort=priority]');
        console.log('  done <id>');
        console.log('  remove <id>');
        console.log('  clear');
        console.log('  edit <id> <new description>');
        break;
}