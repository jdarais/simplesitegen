import unified = require('unified');
import remarkParse = require('remark-parse');
import remark2rehype = require('remark-rehype');
import rehypeStringify = require('rehype-stringify');
import frontMatter = require('remark-frontmatter');
const rehypeFormat: any = require('rehype-format');
const smartypants: any = require('@silvenon/remark-smartypants');

import { Remarkable } from 'remarkable';
import * as matter from 'gray-matter';

import yaml = require('js-yaml');

export const getYaml = (cb: (v: any) => void) => {
    const visitNode = (node: any, file: any) => {
        if (node.type === 'yaml' && cb) {
            cb(yaml.safeLoad(node.value));
        }

        if (node.children) {
            node.children.forEach((child: any) => {
                visitNode(child, file);
            });
        }
    };

    return visitNode;
}

export const parseMarkdown = (fileContent: string) => {
    const file = matter(fileContent);

    const md = new Remarkable({
        html: true,
        typographer: true
    });
    const body = md.render(file.content);

    return Promise.resolve({
        ...file.data,
        body: body
    });
}