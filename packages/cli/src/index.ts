#!/usr/bin/env node
import { Command } from "commander";
import { registerInitCommand } from "./commands/init.js";
import { registerDoctorCommand } from "./commands/doctor.js";
import { registerRunCommand } from "./commands/run.js";
import { registerWorkflowCommand } from "./commands/workflow.js";
import { registerArtifactsCommand } from "./commands/artifacts.js";
import { registerMemoryCommand } from "./commands/memory.js";

const program = new Command();

program.name("bos").description("BusinessOS CLI").version("0.1.0");

registerInitCommand(program);
registerDoctorCommand(program);
registerRunCommand(program);
registerWorkflowCommand(program);
registerArtifactsCommand(program);
registerMemoryCommand(program);

program.parseAsync(process.argv);
