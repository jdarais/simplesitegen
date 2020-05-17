import * as glob from 'glob';
import { map } from 'async';

const fs: any = require('fs');
const path: any = require('path');

type PageData = any;

export interface Page {
    data: PageData,
    render: (data: PageData) => Promise<string>,
    outFile: string
}

export function createPagesFromFiles(
    filePattern: string,
    fileToData: (fileContents: string) => Promise<PageData>,
    render: (data: PageData) => Promise<string>,
    outFile: (data: PageData) => string): Promise<Page[]> {

    return new Promise((resolve, reject) => {
        glob(filePattern, (err: Error, matches: string[]) => {
            if (err) {
                reject(err);
            }

            map(matches, (match, cb) => {
                const contents = fs.readFileSync(match);

                fileToData(contents).then((data: PageData) => {
                    const filePath = path.parse(match);
                    data._meta = {
                        filePath: match,
                        fileName: filePath.name,
                        fileDir: filePath.dir,
                        fileExt: filePath.ext
                    }
    
                    const outPath: string = outFile(data);
    
                    cb(null, {
                        data: data,
                        render: render,
                        outFile: outPath
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
    outFile: string): Page {

    return {
        data: data,
        render: render,
        outFile: outFile
    };
}

export function addLinks(pages: Page[]): void {
    const numPages = pages.length;
    for(let i = 0; i < numPages; ++i) {
        pages[i].data._meta.links = {
            prev: i > 0 ? pages[i-1].outFile : null,
            next: i < numPages - 1 ? pages[i+1].outFile : null
        };
    }
}

export function generate(pages: Page[], outDir: string): void {
    pages.forEach(page => {
        page.render(page.data).then(renderedContent => {
            const outPath = path.join(outDir, page.outFile);
            const outFileDir = path.dirname(outPath);
            fs.mkdirSync(outFileDir, {recursive: true});
            fs.writeFileSync(outPath, renderedContent);
        });
    });
}
