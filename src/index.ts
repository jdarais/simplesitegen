import * as glob from 'glob';
import { map, each } from 'async';

const fs: any = require('fs');
const path: any = require('path');
const process: any = require('process');

type PageData = any;
type SiteData = any;

export interface Page {
    data: PageData,
    render: (data: PageData) => Promise<string>
}

export interface CreatePagesFromFilesParams {
    rootDir?: string,
    filePattern: string,
    fileToData: (fileContents: string) => Promise<PageData>,
    render: (data: PageData) => Promise<string>,
    getLink: (data: PageData) => string,
    siteData?: SiteData
}

const defaultSiteData = {
    baseUrl: '/'
}

const getDefaultLink: (data: PageData) => string = data => {
    return data._site.baseUrl
    + path.join(data._meta.fileDir, data._meta.fileName).split(path.sep).join('/');
}

export function createPagesFromFiles(params: CreatePagesFromFilesParams): Promise<Page[]> {

    const {
        rootDir,
        filePattern,
        fileToData,
        render,
        siteData
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
                    };
                    data._site = {
                        ...defaultSiteData,
                        ...siteData
                    };
    
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

export interface CreatePageParams {
    data: PageData;
    render: (data: PageData) => Promise<string>;
    link: string;
    siteData?: SiteData;
}

export function createPage(params: CreatePageParams): Page {
    const {
        data,
        render,
        link,
        siteData
    } = params;

    let pageData = {
        ...data,
        _meta: {},
        _site: {
            ...defaultSiteData,
            ...siteData
        }
    };

    pageData._meta.link = pageData._site.baseUrl + link;

    return {
        data: pageData,
        render: render
    };
}

export function addSequenceLinks(pages: Page[]): void {
    const numPages = pages.length;
    for(let i = 0; i < numPages; ++i) {
        pages[i].data._meta.prev = i > 0 ? pages[i-1].data : null,
        pages[i].data._meta.next = i < numPages - 1 ? pages[i+1].data : null
    }
}

export class SiteGenerator {
    private pages: Page[] = [];
    private assets: Asset[] = [];
    private outDir: string;

    constructor(outDir: string) {
        this.outDir = outDir;
    }

    addPages(pages: Page) {
        this.pages = this.pages.concat(pages);
    }

    addAssets(sourceDir: string, pattern: string) {
        const matches = glob.sync(pattern, {cwd: sourceDir});

        matches.forEach(match => {
            if (!fs.statSync(path.join(sourceDir, match)).isDirectory()) {
                this.assets.push({
                    basePath: sourceDir,
                    path: match
                });
            }
        });
    }

    generate(): Promise<void> {
        return Promise.all([
            generatePages(this.pages, this.outDir),
            copyAssets(this.assets, this.outDir)
        ]).then(() => {});
    }
}

export interface Asset {
    basePath: string;
    path: string;
}

export function copyAssets(assets: Asset[], outDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
        each(
            assets,
            (asset, cb) => {
                const fullSourcePath = path.join(asset.basePath, asset.path);
                const fileContents = fs.readFileSync(fullSourcePath);
        
                const outPath = path.join(outDir, asset.path);
                fs.mkdir(path.dirname(outPath), {recursive: true}, (err: Error) => {
                    if (err) { reject(err); return; }
                    fs.writeFile(outPath, fileContents, cb);
                });
            },
            err => {
                if (err) { reject(err); return; }
                resolve();
            }
        );
    });
}

export function generatePages(pages: Page[], outDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
        each(
            pages,
            (page, cb) => {
                page.render(page.data).then(renderedContent => {
                    const outFileDir = path.join(outDir, page.data._meta.link);
                    const outPath = path.join(outFileDir, 'index.html');
                    fs.mkdir(outFileDir, {recursive: true}, (err: Error) => {
                        if (err) { reject(err); return; }
                        fs.writeFile(outPath, renderedContent, cb);
                    });
                });
            },
            err => {
                if (err) { reject(err); return; }
                resolve();
            }
        );
    });
}
