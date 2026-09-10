#!/usr/bin/env bun
/**
 * Fails if any `biome-ignore` comment lacks a real justification.
 *
 * Biome only requires *some* text after the colon - this enforces that the
 * text is an actual explanation of why the ignore is unavoidable, not a
 * placeholder like "reason" or "fix later".
 */

const MIN_REASON_LENGTH = 15;

const BANNED_REASONS = [
	"reason",
	"todo",
	"fixme",
	"fix later",
	"temp",
	"temporary",
	"wip",
	"ignore",
	"workaround",
	"needed",
	"required",
	"n/a",
	"na",
];

const IGNORE_LINE =
	/biome-ignore(?:-all)?\s+lint\/[\w./-]+(?:\s+lint\/[\w./-]+)*\s*:\s*(.*)$/;

const IGNORED_DIRS = new Set([
	"node_modules",
	"dist",
	"build",
	"graphify-out",
	".git",
]);

interface Violation {
	file: string;
	line: number;
	text: string;
	problem: string;
}

async function collectFiles(): Promise<string[]> {
	const glob = new Bun.Glob("**/*.{ts,tsx,js,jsx,mjs,cjs}");
	const files: string[] = [];
	for await (const file of glob.scan({ cwd: process.cwd(), dot: false })) {
		if ([...IGNORED_DIRS].some((dir) => file.split("/").includes(dir)))
			continue;
		files.push(file);
	}
	return files;
}

function checkReason(reason: string): string | null {
	const trimmed = reason
		.trim()
		.replace(/\*\/\s*$/, "")
		.trim();
	if (trimmed.length === 0) return "no reason given after the colon";
	if (trimmed.length < MIN_REASON_LENGTH) {
		return `reason too short to be a real explanation ("${trimmed}")`;
	}
	const normalized = trimmed.toLowerCase().replace(/[.!]+$/, "");
	if (BANNED_REASONS.includes(normalized)) {
		return `reason is a placeholder, not an explanation ("${trimmed}")`;
	}
	return null;
}

async function main() {
	const files = await collectFiles();
	const violations: Violation[] = [];

	for (const file of files) {
		const content = await Bun.file(file).text();
		const lines = content.split("\n");
		lines.forEach((line, index) => {
			const match = line.match(IGNORE_LINE);
			if (!match) return;
			const problem = checkReason(match[1] ?? "");
			if (problem) {
				violations.push({ file, line: index + 1, text: line.trim(), problem });
			}
		});
	}

	if (violations.length === 0) {
		console.log(`✓ all biome-ignore comments have a real justification`);
		return;
	}

	console.error(
		`✗ ${violations.length} biome-ignore comment(s) missing a real justification:\n`,
	);
	for (const v of violations) {
		console.error(`  ${v.file}:${v.line}`);
		console.error(`    ${v.text}`);
		console.error(`    → ${v.problem}\n`);
	}
	console.error(
		"Every biome-ignore needs an adjacent comment explaining exactly why the ignore is unavoidable. If it isn't, fix the underlying code instead of suppressing the lint.",
	);
	process.exit(1);
}

main();
