declare type PageData = any;
declare type SiteData = any;
export interface Page {
    data: PageData;
    render: (data: PageData) => Promise<string>;
}
export interface CreatePagesFromFilesParams {
    rootDir?: string;
    filePattern: string;
    fileToData: (fileContents: string) => Promise<PageData>;
    render: (data: PageData) => Promise<string>;
    getLocation: (data: PageData) => string;
    siteData?: SiteData;
}
export declare function createPagesFromFiles(params: CreatePagesFromFilesParams): Promise<Page[]>;
export interface CreatePageSequenceParams {
    data: PageData[];
    render: (data: PageData) => Promise<string>;
    baseLocation: string;
    fileName?: string;
    siteData?: SiteData;
}
export declare function createPageSequence(params: CreatePageSequenceParams): Page[];
export interface CreatePageParams {
    data: PageData;
    render: (data: PageData) => Promise<string>;
    location: string;
    siteData?: SiteData;
}
export declare function createPage(params: CreatePageParams): Page;
export declare function addSequenceLinks(pages: Page[]): void;
export declare class SiteGenerator {
    private pages;
    private assets;
    private outDir;
    constructor(outDir: string);
    addPages(pages: Page): void;
    addAssets(sourceDir: string, pattern: string): void;
    generate(): Promise<void>;
}
export interface Asset {
    basePath: string;
    path: string;
}
export declare function copyAssets(assets: Asset[], outDir: string): Promise<void>;
export declare function generatePages(pages: Page[], outDir: string): Promise<void>;
export {};
