#!/usr/bin/env node


import { generateModelsCommand } from './commands/generate-models.js'
import { generateSqlCommand } from './commands/generate-sql.js';


generateModelsCommand();
generateSqlCommand();
