import * as glob from 'glob';
import { map, each, eachSeries } from 'async';
import * as _ from 'underscore';
import G = require('glob');

import fs = require('fs');
import path = require('path');
import process = require('process');

type PageData = any;
type SiteData = any;

export interface CreatePagesFromFilesParams {
    rootDir?: string;
    filePattern: string;
    fileToData: (fileContents: string) => Promise<PageData>;
    getLocation: (data: PageData) => string;
    siteData?: SiteData;
}

const defaultSiteData = {
    baseUrl: '/'
}

const ensureEndsWithSlash: (url: string) => string = url => {
    return url[url.length - 1] === '/' ? url : url + '/';
}

const getDefaultLocation: (data: PageData) => string = data => {
    return data._site.baseUrl
    + path.join(data._meta.fileDir, data._meta.fileName).split(path.sep).join('/') + '/index.html';
}

const getLinkFromLocation: (location: string) => string = location => {
    const result = /(.*\/)index.html$/.exec(location);
    if (result) {
        return result[1];
    } else {
        return location;
    }
}

export function createGroups<T, G>(arr: Array<T>, groupAssignment: (item: T) => G | Array<G>): Map<G, Array<T>> {
    let groups: Map<G, Array<T>> = new Map();
    arr.forEach(item => {
        const group = groupAssignment(item);
        const groupArr = Array.isArray(group) ? group : [group];
        groupArr.forEach(g => {
            if (!groups.has(g)) {
                groups.set(g, []);
            }
            groups.get(g).push(item);
        });
    });

    return groups;
}

export function createPagesFromFiles(params: CreatePagesFromFilesParams): Promise<PageData[]> {

    const {
        rootDir,
        filePattern,
        fileToData,
        siteData
    } = params;

    const getLocation = params.getLocation || getDefaultLocation;

    return new Promise((resolve, reject) => {
        const cwd = rootDir !== undefined ? path.join(process.cwd(), rootDir) : process.cwd();
        glob(filePattern, {cwd: cwd}, (err: Error, matches: string[]) => {
            if (err) {
                reject(err);
            }

            map(matches, (match, cb) => {
                const contents = fs.readFileSync(path.join(rootDir, match));

                fileToData(contents.toString()).then((data: PageData) => {
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
    
                    data._meta.location = getLocation(data);
                    data._meta.link = getLinkFromLocation(data._meta.location);
    
                    cb(null, data);
                })
            },
            (err: Error, pages: PageData[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(pages);
                }
            });
        })
    });
}

export interface CreatePageSequenceParams {
    data: PageData[];
    baseLocation: string;
    fileName?: string;
    siteData?: SiteData;
}

export function createPageSequence(params: CreatePageSequenceParams): PageData[] {
    const {
        data,
        siteData
    } = params;

    const baseLocation = ensureEndsWithSlash(params.baseLocation);
    const fileName = params.fileName || 'index.html';

    let pageData = data.map(d => ({
        ...d,
        _meta: {},
        _site: {
            ...defaultSiteData,
            ...siteData
        }
    }));

    pageData.forEach((d, i) => {
        d._meta.location = d._site.baseUrl + baseLocation + (i > 0 ? `${i}/` : '') + fileName;
        d._meta.link = getLinkFromLocation(d._meta.location);
    });

    addSequenceLinks(pageData);

    return pageData;
}

export interface CreateIndexParams {
    pages: PageData[];
    createIndexPageData: (pageItems: PageData[]) => PageData;
    itemsPerPage?: number;
    baseLocation: string;
    fileName?: string;
    siteData?: SiteData;
}

export function createIndex(params: CreateIndexParams): PageData[] {
    const {
        pages,
        createIndexPageData,
        siteData
    } = params;

    const baseLocation = ensureEndsWithSlash(params.baseLocation);
    const itemsPerPage = params.itemsPerPage !== undefined ? params.itemsPerPage : pages.length;
    const fileName = params.fileName || 'index.html';

    let indexPagesData = _.chunk(pages, itemsPerPage).map(createIndexPageData);
    indexPagesData.forEach((indexPageData, i) => {
        indexPageData._site = {
            ...defaultSiteData,
            ...siteData
        };

        const location = indexPageData._site.baseUrl + baseLocation + (i > 0 ? `${i}/` : '') + fileName;

        indexPageData._meta = {
            location: location,
            link: getLinkFromLocation(location)
        }
    });

    addSequenceLinks(indexPagesData);

    return indexPagesData;
}

export interface CreatePageParams {
    data: PageData;
    location: string;
    siteData?: SiteData;
}

export function createPage(params: CreatePageParams): PageData {
    const {
        data,
        location,
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

    pageData._meta.location = pageData._site.baseUrl + location;
    pageData._meta.link = getLinkFromLocation(pageData._meta.location);

    return pageData;
}

export function addSequenceLinks(pages: PageData[]): void {
    const numPages = pages.length;
    for(let i = 0; i < numPages; ++i) {
        pages[i]._meta.prev = i > 0 ? pages[i-1] : null,
        pages[i]._meta.next = i < numPages - 1 ? pages[i+1] : null
    }
}

interface Page {
    data: PageData;
    render: (data: PageData) => Promise<string>;
}

export class SiteGenerator {
    private pages: Page[] = [];
    private assets: Asset[] = [];
    private outDir: string;

    constructor(outDir: string) {
        this.outDir = outDir;
    }

    addPages(pages: PageData[], render: (data: PageData) => Promise<string>) {
        this.pages = this.pages.concat(pages.map(data => ({data: data, render: render})));
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
        return generatePages(this.pages, this.outDir).then(() =>
            copyAssets(this.assets, this.outDir));

    }
}

interface Asset {
    basePath: string;
    path: string;
}

function copyAssets(assets: Asset[], outDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
        each(
            assets,
            (asset, cb) => {
                const fullSourcePath = path.join(asset.basePath, asset.path);
                const fileContents = fs.readFileSync(fullSourcePath);
        
                const outPath = path.join(outDir, asset.path);

                createDir(path.dirname(outPath), (err: any) => {
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

function generatePages(pages: Page[], outDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
        each(
            pages,
            (page, cb) => {
                page.render(page.data).then(renderedContent => {
                    const outPath = path.join(outDir, page.data._meta.location);
                    createDir(path.dirname(outPath), (err) => {
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

function createDir(dirPath: string, done: (err: any) => void): void {
    const dirPathArr = dirPath.split(path.sep);
    const dirsToCreate = dirPathArr.map((_dir, i) => dirPathArr.slice(0,i+1).join(path.sep));
    eachSeries(
        dirsToCreate,
        (dir, cb) => {
            fs.mkdir(dir, {recursive: true}, (err: any) => {
                // Only pass along the error if it's not that the directory already exists
                if (err && err.code !== 'EEXIST') {
                    cb(err);
                    return;
                }
                cb();
            });
        },
        done
    );
}
