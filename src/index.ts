import * as glob from 'glob';
import { map } from 'async';

const fs: any = require('fs');
const path: any = require('path');
const process: any = require('process');

type PageData = any;

export interface Page {
    data: PageData,
    render: (data: PageData) => Promise<string>
}

export interface CreatePagesFromFilesParams {
    rootDir?: string,
    filePattern: string,
    fileToData: (fileContents: string) => Promise<PageData>,
    render: (data: PageData) => Promise<string>,
    getLink: (data: PageData) => string
}

const getDefaultLink: (data: PageData) => string = data => path.join(data._meta.fileDir, data._meta.fileName);

export function createPagesFromFiles(params: CreatePagesFromFilesParams): Promise<Page[]> {

    const {
        rootDir,
        filePattern,
        fileToData,
        render
    } = params;

    const getLink = params.getLink || getDefaultLink;

    return new Promise((resolve, reject) => {
        const cwd = rootDir !== undefined ? path.join(process.cwd(), rootDir) : process.cwd();
        glob(filePattern, {cwd: cwd}, (err: Error, matches: string[]) => {
            if (err) {
                reject(err);
            }

            map(matches, (match, cb) => {
                const contents = fs.readFileSync(path.join(rootDir, match));

                fileToData(contents).then((data: PageData) => {
                    const filePath = path.parse(match);
                    data._meta = {
                        filePath: match,
                        fileName: filePath.name,
                        fileDir: filePath.dir,
                        fileExt: filePath.ext
                    }
    
                    data._meta.link = getLink(data);
    
                    cb(null, {
                        data: data,
                        render: render
                    });
                })
            },
            (err: Error, pages: Page[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(pages);
                }
            });
        })
    });
}

export function createPage(
    data: PageData,
    render: (data: PageData) => Promise<string>,
    link: string): Page {

    return {
        data: {
            ...data,
            _meta: {
                link: link
            }
        },
        render: render
    };
}

export function addSequenceLinks(pages: Page[]): void {
    const numPages = pages.length;
    for(let i = 0; i < numPages; ++i) {
        pages[i].data._meta.prev = i > 0 ? pages[i-1].data._meta.link : null,
        pages[i].data._meta.next = i < numPages - 1 ? pages[i+1].data._meta.link : null
    }
}

export function copyStaticAssets(sourceDir: string, pattern: string, destDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
        glob(pattern, {cwd: sourceDir}, (err, matches) => {
            if (err != null) {
                reject(err);
            }

            matches.forEach(match => {
                const sourcePath = path.join(sourceDir, match);
                const contents = fs.readFileSync(sourcePath);
                const destPath = path.join(destDir, match);
                fs.mkdirSync(path.dirname(destPath), {recursive: true});
                fs.writeFileSync(destPath, contents);
            });
        });
    });
}

export function generate(pages: Page[], outDir: string): void {
    pages.forEach(page => {
        page.render(page.data).then(renderedContent => {
            const outFileDir = path.join(outDir, page.data._meta.link);
            const outPath = path.join(outFileDir, 'index.html');
            fs.mkdirSync(outFileDir, {recursive: true});
            fs.writeFileSync(outPath, renderedContent);
        });
    });
}
