"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMarkdown = exports.getYaml = void 0;
var unified = require("unified");
var remarkParse = require("remark-parse");
var remark2rehype = require("remark-rehype");
var rehypeStringify = require("rehype-stringify");
var frontMatter = require("remark-frontmatter");
var rehypeFormat = require('rehype-format');
var smartypants = require('@silvenon/remark-smartypants');
var yaml = require("js-yaml");
exports.getYaml = function (cb) {
    var visitNode = function (node, file) {
        if (node.type === 'yaml' && cb) {
            cb(yaml.safeLoad(node.value));
        }
        if (node.children) {
            node.children.forEach(function (child) {
                visitNode(child, file);
            });
        }
    };
    return visitNode;
};
exports.parseMarkdown = function (fileContent) {
    var frontmatter;
    return new Promise(function (resolve, reject) {
        unified()
            .use(remarkParse)
            .use(frontMatter, ['yaml'])
            .use(exports.getYaml, function (yaml) { frontmatter = yaml; })
            .use(smartypants)
            .use(remark2rehype)
            .use(rehypeFormat)
            .use(rehypeStringify)
            .process(fileContent, function (error, result) {
            if (error) {
                reject(error);
            }
            else {
                resolve(__assign(__assign({}, frontmatter), { body: result.contents }));
            }
        });
    });
};
