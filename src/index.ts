import * as glob from 'glob';

const fs: any = require('fs');
const path: any = require('path');

type PageData = any;

export interface Page {
    data: PageData,
    render: (data: PageData) => string,
    outFile: string
}

export function createPagesFromFiles(
    filePattern: string,
    fileToData: (fileContents: string) => PageData,
    render: (data: PageData) => string,
    outFile: (data: PageData) => string): Promise<Page[]> {

    return new Promise((resolve, reject) => {
        glob(filePattern, (err: Error, matches: string[]) => {
            if (err) {
                reject(err);
            }

            const pages: Page[] = matches.map(match => {
                const contents = fs.readFileSync(match);

                let data: PageData = fileToData(contents);

                const filePath = path.parse(match);
                data._meta = {
                    filePath: match,
                    fileName: filePath.name,
                    fileDir: filePath.dir,
                    fileExt: filePath.ext
                }

                const outPath: string = outFile(data);

                return {
                    data: data,
                    render: render,
                    outFile: outPath
                }
            });

            resolve(pages);
        })
    });
}

export function createPage(
    data: PageData,
    render: (data: PageData) => string,
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