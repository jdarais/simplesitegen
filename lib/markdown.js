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
var rehypeFormat = require('rehype-format');
var smartypants = require('@silvenon/remark-smartypants');
var remarkable_1 = require("remarkable");
var matter = require("gray-matter");
var yaml = require("js-yaml");
var getYaml = function (cb) {
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
exports.getYaml = getYaml;
var parseMarkdown = function (fileContent) {
    var file = matter(fileContent);
    var md = new remarkable_1.Remarkable({
        html: true,
        typographer: true
    });
    var body = md.render(file.content);
    return Promise.resolve(__assign(__assign({}, file.data), { body: body }));
};
exports.parseMarkdown = parseMarkdown;
