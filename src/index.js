#!/usr/bin/env node

const escodegen = require('escodegen');
const espree = require("espree");
const estraverse = require('estraverse');
const fs = require('fs');
const path = require('path');
const yargs = require('yargs');

function main({bundle, outputDir}) {
  const bundleContent = fs.readFileSync(bundle, {encoding: 'utf-8'});
  const ast = espree.parse(bundleContent);
  const modules = extractModules(ast)
      .map(parseModule)
      .map(rewriteModule);

  modules.forEach((module) => {
    const modulePath = path.join(outputDir, module.name);
    const moduleImpl = escodegen.generate(module, {
      format: {indent: {style: '  '}}
    });
    fs.writeFileSync(modulePath, moduleImpl);
  });

  const mainModuleImpl = escodegen.generate(ast, {
    format: {indent: {style: '  '}}
  });
  fs.writeFileSync(path.join(outputDir, 'main.js'), mainModuleImpl);
}

function expectNode(type, node) {
  if (node.type !== type) {
    throw new Error(`Node is not of expected type ${type} but is instead ${node.type}`)
  }
  return node;
}

function parseModule(node) {
  const implAst = expectNode('FunctionExpression', node.arguments[0]);
  const moduleId = expectNode('Literal', node.arguments[1]).value;
  const dependencies = expectNode('ArrayExpression', node.arguments[2])
      .elements
      .map(node => expectNode('Literal', node).value);

  return {
    implAst,
    moduleId,
    dependencies
  };
}

function getModuleName(moduleId) {
  return `mod_${moduleId}`
}

function rewriteModule(module) {
  const dependencyLocals = module.implAst.params
      .map(param => expectNode('Identifier', param).name);
  const importDecls = module.dependencies
      .map((moduleId, i) => ({
        type: 'ImportDeclaration',
        specifiers: [
          {
            type: 'ImportDefaultSpecifier',
            local: {
              type: 'Identifier',
              name: dependencyLocals[i],
            },
          }
        ],
        source: {
          type: "Literal",
          value: `./${getModuleName(moduleId)}`,
          raw: `'./${getModuleName(moduleId)}'`
        }
      }));

  return {
    type: 'Program',
    name: `${getModuleName(module.moduleId)}.js`,
    body: [
      ...importDecls,
      ...module.implAst.body.body,
    ],
    sourceType: 'module',
  }
}

function extractModules(ast) {
  const modules = [];
  estraverse.replace(ast, {
    enter: function (node) {
      if (node.type === 'ExpressionStatement' &&
          node.expression.type === 'CallExpression' &&
          node.expression.callee.name === '__d') {
        // Keep the node for later, but remove it from the original AST, so we can dump a "main" module.
        modules.push(node.expression);
        return this.remove()
      }
    }
  });
  return modules
}

yargs
    .scriptName("rn-debundle")
    .command('$0 <bundle> <output-dir>', 'rn-debundle', (yargs) => {
      yargs.positional('bundle', {
        type: 'string',
        describe: 'Path to compiled React Native bundle to debundle'
      });
      yargs.positional('output-dir', {
        type: 'string',
        describe: 'Path to write decompiled bundle data into',
      });
    }, main)
    .help()
    .argv;

