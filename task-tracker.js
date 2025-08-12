
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

        // sorting option: Check to see if user wants tasks sorted by priority
        const sortArg = rawParams.find(param => param.startsWith('--sort='));
        const sortBy = sortArg ? sortArg.split('=')[1] : null;

        if (sortBy === 'priority') {
            // Define priority order for sorting (1 being the highest priority, 3 being the lowest priority)
            const priorityOrder = { high: 1, medium: 2, low: 3 };
            tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        }

        // today's date in YYYY-MM-DD format 
        const today = new Date();
        const todayString = today.getFullYear() + '-' + 
                           String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(today.getDate()).padStart(2, '0');

        // display logic: Loop through each task(s) and format each task
        tasks.forEach(task => {
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
                    dueInfo = chalk.yellow(`Due Today!`);
                } else {
                    dueInfo = chalk.magenta(` Upcoming (Due: ${task.dueDate})`);
                }
            }

            // Format for the task with all the information that pertains to the task accordingly
            const fullText = `Task: ${task.text} (ID: ${task.id})\n   Priority: ${task.priority} | ${dueInfo}`;

            // Display completed tasks in green, pending tasks in default color
            if (task.done) {
                console.log(chalk.green(fullText));
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
        // default case:  user enters a command that isn’t recognized, suggestions on what the user needs to add is given
        console.log(chalk.yellow('Unknown command. Use one of the following:'));
        console.log('  add <task> [--priority=low|medium|high] [--due=YYYY-MM-DD]');
        console.log('  list [--sort=priority]');
        console.log('  done <id>');
        console.log('  remove <id>');
        console.log('  clear');
        console.log('  edit <id> <new description>');
        break;
}