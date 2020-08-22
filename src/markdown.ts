import unified = require('unified');
import remarkParse = require('remark-parse');
import remark2rehype = require('remark-rehype');
import rehypeStringify = require('rehype-stringify');
import frontMatter = require('remark-frontmatter');
const rehypeFormat: any = require('rehype-format');
const smartypants: any = require('@silvenon/remark-smartypants');

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
    let frontmatter: any;

    return new Promise((resolve, reject) => {
        unified()
        .use(remarkParse, )
        .use(frontMatter, ['yaml'])
        .use(getYaml, yaml => { frontmatter = yaml })
        .use(smartypants)
        .use(remark2rehype)
        .use(rehypeFormat)
        .use(rehypeStringify)
        .process(fileContent, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve({
                    ...frontmatter,
                    body: result.contents
                });
            }
        });
    });
}