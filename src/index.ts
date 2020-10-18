import * as glob from 'glob';
import { map, each, eachSeries } from 'async';
import * as _ from 'underscore';
import G = require('glob');

import fs = require('fs');
import path = require('path');
import process = require('process');

export const parseMarkdown = require('./markdown').parseMarkdown;

type PageData = any;
type SiteData = any;

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

/**
 * Group objects using a given criteria
 * @param arr The objects to be grouped
 * @param groupAssignment Function to assign an object to a group.  If an array is returned, the object will appear in multiple groups
 */
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

export interface CreatePagesFromFilesParams {
    /** The root directory to read the files from, relative to CWD.  Defaults to CWD. */
    rootDir?: string;
    /** Glob pattern for files to read.  Any matching files will be read */
    filePattern: string;
    /** Function to process the file input into PageData */
    fileToData: (fileContents: string) => Promise<PageData>;
    /** Function to provide the location for the page based on its PageData */
    getLocation: (data: PageData) => string;
    /** SiteData to be added to the _site attribute */
    siteData?: SiteData;
}

/**
 * Generate PageData objects from files
 * @param params 
 */
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
    /** The list of PageData objects to add _meta and _site attributes to */
    data: PageData[];
    /** Location in which the page sequence will be placed.  Each page will be placed in a subdirectory named after its index number */
    baseLocation: string;
    /** File name to give to the generated pages.  Defaults to 'index.html' */
    fileName?: string;
    /** Site data to add to the _site attribute */
    siteData?: SiteData;
}

/**
 * Creates PageData objects, and automatically adds _meta.prev and _meta.next attributes to link the pages in the sequence.
 * @param params 
 */
export function createPageSequence(params: CreatePageSequenceParams): PageData[] {
    const {
        data,
        siteData
    } = params;

    const baseLocation = (params.baseLocation.length === 0 || params.baseLocation === '/') ?
        '' :
        ensureEndsWithSlash(params.baseLocation);

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
    /** List of pages to include in the index */
    pages: PageData[];
    /** Function to create the full PageData for an index page given the list of pages that it should contain */
    createIndexPageData: (pageItems: PageData[]) => PageData;
    /** If included, the index will be paginated with the specified number of items per page */
    itemsPerPage?: number;
    /** The location in the generated site where the index files should be placed */
    baseLocation: string;
    /** File name to give the output files.  Defaults to 'index.html' */
    fileName?: string;
    /** Site data to be added to the _site attribute of the created PageData objects */
    siteData?: SiteData;
}

/**
 * Create an index page for a list of pages.  This can be used to create an index page for all posts in a blog, or a tag or category archive.
 * @param params 
 */
export function createIndex(params: CreateIndexParams): PageData[] {
    const {
        pages,
        createIndexPageData,
        siteData
    } = params;

    const baseLocation = (params.baseLocation.length === 0 || params.baseLocation === '/') ?
        '' :
        ensureEndsWithSlash(params.baseLocation);

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
    /** PageData to append _meta and _site information to */
    data: PageData;
    /** Location where the page should exist within the site */
    location: string;
    /** Site data that will be added under the _site attribute */
    siteData?: SiteData;
}

/**
 * Create a page.  This essentially attaches appropriate _meta and _site attributes to the object
 * @param params 
 */
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

/**
 * Add _meta.prev and _meta.next attributes to each of the pages in the array to link them together
 * @param pages {PageData[]} The sequence of pages to link
 */
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

/**
 * Primary object for generating a static site
 */
export class SiteGenerator {
    private pages: Page[] = [];
    private assets: Asset[] = [];
    private outDir: string;

    /**
     * 
     * @param outDir {string} Directory in which to generate the static site
     */
    constructor(outDir: string) {
        this.outDir = outDir;
    }

    /**
     * Add pages to the site, which will be generated when the 'generate()' function is called
     * @param pages {PageData[]} An array of one or more PageData objects that will be used to generate sites.  One page will be generated for each PageData in the array.
     * @param render {(data: PageData) => Promise<string>} The render function to use to generate a page
     */
    addPages(pages: PageData[], render: (data: PageData) => Promise<string>) {
        this.pages = this.pages.concat(pages.map(data => ({data: data, render: render})));
    }

    /**
     * Add static assets to the site, which will be copied over when the 'generate()' function is called.
     * The location of the asset in the generated site will be the relative path of the file from 'sourceDir'.
     * @param sourceDir {string} The source directory to copy files from
     * @param pattern {string} Glob pattern to match files.  Matched files will be copied.
     */
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

    /**
     * Generate the site
     */
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
