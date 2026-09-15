#!/usr/bin/env bun
/**
 * Fails if any `oxlint-disable*` comment lacks a real justification.
 *
 * Oxlint doesn't require a reason at all - this enforces the `-- reason`
 * convention (matching eslint-disable) and checks that the text is an actual
 * explanation of why the ignore is unavoidable, not a placeholder like
 * "reason" or "fix later".
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

// "oxlint-disable*" must be the directive right after the comment opener -
// text that merely mentions it later in an explanatory comment doesn't count.
const COMMENT_WITH_DIRECTIVE =
	/^\s*(?:\/\/|\/\*)\s*oxlint-disable(?:-next-line|-line)?\b/;
const REASON = /--\s*(.*?)\s*\*?\/?\s*$/;

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
	if (trimmed.length === 0) return "no reason given after the `--`";
	if (trimmed.length < MIN_REASON_LENGTH) {
		return `reason too short to be a real explanation ("${trimmed}")`;
	}
	const normalized = trimmed.toLowerCase().replace(/[.!]+$/, "");
	if (BANNED_REASONS.includes(normalized)) {
		return `reason is a placeholder, not an explanation ("${trimmed}")`;
	}
	return null;
}

async function checkFile(file: string): Promise<Violation[]> {
	const content = await Bun.file(file).text();
	const violations: Violation[] = [];
	const lines = content.split("\n");
	lines.forEach((line, index) => {
		if (!COMMENT_WITH_DIRECTIVE.test(line)) return;
		const match = line.match(REASON);
		const problem = checkReason(match?.[1] ?? "");
		if (problem) {
			violations.push({ file, line: index + 1, text: line.trim(), problem });
		}
	});
	return violations;
}

async function main() {
	const files = await collectFiles();
	const violations = (await Promise.all(files.map(checkFile))).flat();

	if (violations.length === 0) {
		console.log(`✓ all oxlint-disable comments have a real justification`);
		return;
	}

	console.error(
		`✗ ${violations.length} oxlint-disable comment(s) missing a real justification:\n`,
	);
	for (const v of violations) {
		console.error(`  ${v.file}:${v.line}`);
		console.error(`    ${v.text}`);
		console.error(`    → ${v.problem}\n`);
	}
	console.error(
		"Every oxlint-disable needs a `-- reason` explaining exactly why the ignore is unavoidable. If it isn't, fix the underlying code instead of suppressing the lint.",
	);
	process.exit(1);
}

main();
