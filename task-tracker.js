const fs = require('fs');           
const path = require('path');      
const chalk = require('chalk');     

// Define the file path where tasks will be stored as JSON
const filePath = path.join(__dirname, 'tasks.json');

// Initialize tasks file if it doesn't exist, which ensures the application works on first run
if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([])); 
}


function loadTasks() {
    try {
        // Read the file and parse as JSON
        const data = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        // If file is corrupted or doesn't exist, return empty array
        return [];
    }
}

//tasks in the array are saved to JSON file
function saveTasks(tasks) {
    // tasks in the array are written to the file
    fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2));
}

 
function parseArgs(args) {
    const options = {}; 
    const rest = [];    

    // Loop through all tasks
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--priority=')) {
            //  priority value option
            options.priority = args[i].split('=')[1].toLowerCase();
        } else if (args[i].startsWith('--due=')) {
            //  due date filter
            options.dueDate = args[i].split('=')[1];
        } else if (args[i].startsWith('--sort=')) {
            //  sort option
            options.sort = args[i].split('=')[1];
        } else {
            // If it's not a flag, it's part of the task description
            rest.push(args[i]);
        }
    }

    // return tasks as two options
    return { taskText: rest.join(' '), options };
}

// Parsing command line arguments
const args = process.argv.slice(2);
const command = args[0];        // First argument is the command that the user inputs
const rawParams = args.slice(1); // Remaining arguments are parameters

//switch/case statement for optimal efficiency
switch (command) {
    case 'add': {
        // add command: Create new task with optional priority and optional due date
        const { taskText, options } = parseArgs(rawParams);

        // Validation that user provided an appropriate task description
        if (!taskText) {
            console.log(chalk.red('Please provide a task description.'));
            break;
        }

        // Load existing tasks from file
        const tasks = loadTasks();
        
        // Create new task object with unique ID 
        //other attribtues that are applied to the task, such as priority and if the task is done
        tasks.push({
            id: Date.now(),                          
            text: taskText,                        
            done: false,                             
            priority: options.priority || 'medium',  
            dueDate: options.dueDate || null       
        });

        // Save updated task(s) and showcase information about the tasks to the user
        saveTasks(tasks);
        console.log(chalk.green(`Task added: "${taskText}"`));
        break;
    }

    case 'list': {
        // List command: Display all tasks that were created by the user
        let tasks = loadTasks();

        // Check to see if there are any tasks to display
        if (tasks.length === 0) {
            console.log(chalk.yellow('No tasks found.'));
            break;
        }

        // Extra filtering options providing the user better task management practices. 
        //user can filter a task based on status, priority, and whether a task is due tdoday or not
        const statusFilter = rawParams.find(param => param.startsWith('--status='));
        const priorityFilter = rawParams.find(param => param.startsWith('--priority='));
        const todayOnly = rawParams.includes('--today');

        // Apply done or pending status filter to a task
        if (statusFilter) {
            const status = statusFilter.split('=')[1];
            if (status === 'done') {
                tasks = tasks.filter(task => task.done);
            } else if (status === 'pending') {
                tasks = tasks.filter(task => !task.done);
            }
        }

        // Apply priority filter to a task
        if (priorityFilter) {
            const priority = priorityFilter.split('=')[1];
            tasks = tasks.filter(task => task.priority === priority);
        }

        // Apply today filter to a task
        if (todayOnly) {
            const today = new Date();
            const todayString = today.getFullYear() + '-' + 
                               String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                               String(today.getDate()).padStart(2, '0');
            tasks = tasks.filter(task => task.dueDate === todayString);
        }

        // sorting option: Check to see if user wants tasks sorted by priority or due date
        const sortArg = rawParams.find(param => param.startsWith('--sort='));
        const sortBy = sortArg ? sortArg.split('=')[1] : null;

        if (sortBy === 'priority') {
            // Define priority order for sorting (1 being the highest priority, 3 being the lowest priority)
            const priorityOrder = { high: 1, medium: 2, low: 3 };
            tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        } else if (sortBy === 'due') {
            // Sort tasks by due date (earliest due date is first)
            tasks.sort((a, b) => {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1; // Tasks without due date go to the end
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            });
        }

        // Checking to see if the filters provided by the user gave back no tasks
        if (tasks.length === 0) {
            console.log(chalk.yellow('No tasks match the current filters.'));
            break;
        }

        // Display task count
        console.log(chalk.cyan(`\n📋 Showing ${tasks.length} task(s):\n`));

        // display logic: Loop through each task(s) and format each task
        tasks.forEach((task, index) => {
            let dueInfo = 'No due date'; // Message for tasks without due dates
            //if a task contains a due date
            if (task.dueDate) {
                // Date comparison logic: Determine if a task is overdue, due today, or upcoming
                
                //validating time conditions to accurately depict present day
                const dueDateObj = new Date(task.dueDate + 'T00:00:00');
                const today = new Date();
                
                today.setHours(0, 0, 0, 0);

                // Compare dates and set appropriate colored messages that reflect whether a task is overdue, due today, or upcoming
                if (dueDateObj < today) {
                    dueInfo = chalk.red(` Overdue (Due: ${task.dueDate})`);
                } else if (dueDateObj.getTime() === today.getTime()) {
                    dueInfo = chalk.yellow(` Due Today!`);
                } else {
                    dueInfo = chalk.magenta(` Upcoming (Due: ${task.dueDate})`);
                }
            }


  // providing visual aid of priority status and task status to the user 
            const priorityIcon = task.priority === 'high' ? '🔴' : 
                               task.priority === 'medium' ? '🟡' : '🟢';
            const taskStatus = task.done ? '✅' : '⭕';

            const fullText = `${index + 1}. ${taskStatus} ${priorityIcon} ${task.text} (ID: ${task.id})\n Priority: ${task.priority} | ${dueInfo}`;

            // Display completed tasks in gray
            if (task.done) {
                console.log(chalk.gray(fullText));
            } else {
                console.log(fullText);
            }
        });
        break;
    }

    case 'done': {
        // done command: Mark a specific task as completed
        const id = parseInt(rawParams[0]); 
        
        // Validate that user provided a valid numeric ID that is associated to the task. 
        if (isNaN(id)) {
            console.log(chalk.red('Please provide a valid task ID.'));
            break;
        }

        // Load created tasks and find the specific task by ID
        const tasks = loadTasks();
        const task = tasks.find(t => t.id === id);

        // Check if task exists
        if (!task) {
            console.log(chalk.red(`Task with ID ${id} not found.`));
            break;
        }

        // Mark task as completed
        task.done = true;
        saveTasks(tasks);
        console.log(chalk.green(`Marked as done: "${task.text}"`));
        break;
    }

    case 'remove': {
        // remove command: Permanently delete a task
        const id = parseInt(rawParams[0]); 
        
        // Validate that user provided a valid numeric ID that is associated to the task. 
        if (isNaN(id)) {
            console.log(chalk.red('Please provide a valid task ID.'));
            break;
        }

        // Load tasks before deletion
        let tasks = loadTasks();
        const before = tasks.length;
        
        // Filter out the task with matching ID
        tasks = tasks.filter(t => t.id !== id);

        // Check if the task was actually removed
        if (tasks.length === before) {
            console.log(chalk.red(`No task found with ID ${id}.`));
        } else {
            // Save updated tasks and confirm removal
            saveTasks(tasks);
            console.log(chalk.green(`Removed task with ID ${id}.`));
        }
        break;
    }

    case 'clear': {
        // clear command: Remove all tasks which will make the list of tasks empty
        saveTasks([]); //empty array since clear was used
        console.log(chalk.green('All tasks cleared.'));
        break;
    }

    // stats calculations to show remaining tasks completed tasks, and percentage of the list of tasks
    case 'statistics': {
        const tasks = loadTasks();
        
        // Check if there are created tasks to take into consideration
        if (tasks.length === 0) {
            console.log(chalk.yellow('No tasks to account for.'));
            break;
        }

        // Calculating statistics to provide insights to the user
        const total = tasks.length;
        const completed = tasks.filter(task => task.done).length;
        const pending = total - completed;
        
        // Calculate overdue tasks 
        const overdue = tasks.filter(task => {
            if (!task.dueDate || task.done) return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(task.dueDate + 'T00:00:00');
            return dueDate < today;
        }).length;

        // Count high priority tasks that are pending
        const highPriority = tasks.filter(task => !task.done && task.priority === 'high').length;

        // Display comprehensive statistics to provide a visual aid for the user
        //Provide this set of information to give the user a better understanding for where they stand with the tasks they want to accomplish 
        console.log(chalk.cyan('\n Task Statistics:'));
        console.log(`   Total Tasks: ${total}`);
        console.log(`    Completed: ${chalk.green(completed)}`);
        console.log(`    Pending: ${chalk.yellow(pending)}`);
        console.log(`     Overdue: ${chalk.red(overdue)}`);
        console.log(`    High Priority Pending: ${chalk.red(highPriority)}`);
        
        // Calculate and display percentage of tasks that are completed
        if (total > 0) {
            const completionRate = Math.round((completed / total) * 100);
            console.log(`   Completion Rate: ${completionRate}%`);
        }
        break;
    }

    // Search command: search functionality to find tasks by description (keyword)
    case 'search': {
        const searchTerm = rawParams.join(' ').toLowerCase();
        
        // Validate that user provided a search term
        if (!searchTerm) {
            console.log(chalk.red('Please provide a search term.'));
            break;
        }

        // Load tasks and filter by search term (keywords (words used to filter) are case insensitive)
        const tasks = loadTasks();
        const matchingTasks = tasks.filter(task => 
            task.text.toLowerCase().includes(searchTerm)
        );

        // Check if any tasks match the search term keyword
        if (matchingTasks.length === 0) {
            console.log(chalk.yellow(`No tasks found containing "${searchTerm}"`)); //no matching tasks were found
            break;
        }

        // Display search results of matching tasks that were found with visual indicators
        console.log(chalk.cyan(`\n🔍 Found ${matchingTasks.length} task(s) matching "${searchTerm}":\n`));
        
        matchingTasks.forEach((task, index) => {
            const taskStatus = task.done ? '✅' : '⭕';
            const priorityIcon = task.priority === 'high' ? '🔴' : 
                               task.priority === 'medium' ? '🟡' : '🟢';
            
            console.log(`${index + 1}. ${taskStatus} ${priorityIcon} ${task.text} (ID: ${task.id})`);
        });
        break;
    }

    case 'edit': {
        // edit command: change the description of an existing created task
        const id = parseInt(rawParams[0]);              // Task ID to change
        const newDescription = rawParams.slice(1).join(' '); // New description 

        // Validate that user provided a valid numeric ID that is associated to the task. 
        if (isNaN(id)) {
            console.log(chalk.red('Please provide a valid task ID.'));
            break;
        }

        if (!newDescription) {
            console.log(chalk.red('Please provide the new task description.'));
            break;
        }

        // Load tasks and find the task that wants to be updated
        const tasks = loadTasks();
        const task = tasks.find(t => t.id === id);

        // Check if task exists
        if (!task) {
            console.log(chalk.red(`Task with ID ${id} not found.`));
            break;
        }

        // Update task description and save
        task.text = newDescription;
        saveTasks(tasks);
        console.log(chalk.green(`Task ID ${id} updated to: "${newDescription}"`));
        break;
    }

    default:
        // default case: user enters a command that isn't recognized, suggestions on what the user needs to add is given
        console.log(chalk.yellow('Unknown command. Use one of the following:'));
        console.log('  add <task> [--priority=low|medium|high] [--due=YYYY-MM-DD]');
        console.log('  list [--sort=priority|due] [--status=done|pending] [--priority=low|medium|high] [--today]');
        console.log('  search <term>');
        console.log('  stats');
        console.log('  done <id>');
        console.log('  remove <id>');
        console.log('  clear');
        console.log('  edit <id> <new description>');
        break;
}