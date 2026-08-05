import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import ts from "typescript";

const root = process.cwd();
const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
assert.ok(configPath, "tsconfig.json must exist");

const config = ts.getParsedCommandLineOfConfigFile(configPath, {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic(diagnostic) {
        throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    },
});
assert.ok(config, "tsconfig.json must parse");

const isProjectSource = (filePath) =>
    filePath.startsWith(`${root}${sep}`) && /\.[cm]?[jt]sx?$/.test(filePath);

const getRuntimeImports = (filePath) => {
    const source = ts.createSourceFile(
        filePath,
        readFileSync(filePath, "utf8"),
        ts.ScriptTarget.Latest,
    );
    const specifiers = source.statements.flatMap((statement) => {
        if (
            ts.isImportDeclaration(statement) &&
            !statement.importClause?.isTypeOnly &&
            ts.isStringLiteral(statement.moduleSpecifier)
        ) {
            return [statement.moduleSpecifier.text];
        }
        if (
            ts.isExportDeclaration(statement) &&
            !statement.isTypeOnly &&
            statement.moduleSpecifier &&
            ts.isStringLiteral(statement.moduleSpecifier)
        ) {
            return [statement.moduleSpecifier.text];
        }
        return [];
    });

    return specifiers
        .map(
            (specifier) =>
                ts.resolveModuleName(specifier, filePath, config.options, ts.sys)
                    .resolvedModule?.resolvedFileName,
        )
        .filter(isProjectSource);
};

const findCycle = (filePath, visiting = [], checked = new Set()) => {
    const cycleStart = visiting.indexOf(filePath);
    if (cycleStart !== -1) return [...visiting.slice(cycleStart), filePath];
    if (checked.has(filePath)) return null;

    for (const importedFile of getRuntimeImports(filePath)) {
        const cycle = findCycle(importedFile, [...visiting, filePath], checked);
        if (cycle) return cycle;
    }
    checked.add(filePath);
    return null;
};

const entry = resolve(root, "src/game/crew/buildCrewMember.ts");
const cycle = findCycle(entry);
assert.equal(
    cycle,
    null,
    `Crew builder runtime import cycle: ${cycle?.join(" -> ")}`,
);

console.log("Crew builder import-cycle check passed");
