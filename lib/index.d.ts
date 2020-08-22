declare type PageData = any;
declare type SiteData = any;
export interface CreatePagesFromFilesParams {
    rootDir?: string;
    filePattern: string;
    fileToData: (fileContents: string) => Promise<PageData>;
    getLocation: (data: PageData) => string;
    siteData?: SiteData;
}
export declare function createGroups<T, G>(arr: Array<T>, groupAssignment: (item: T) => G | Array<G>): Map<G, Array<T>>;
export declare function createPagesFromFiles(params: CreatePagesFromFilesParams): Promise<PageData[]>;
export interface CreatePageSequenceParams {
    data: PageData[];
    baseLocation: string;
    fileName?: string;
    siteData?: SiteData;
}
export declare function createPageSequence(params: CreatePageSequenceParams): PageData[];
export interface CreateIndexParams {
    pages: PageData[];
    createIndexPageData: (pageItems: PageData[]) => PageData;
    itemsPerPage?: number;
    baseLocation: string;
    fileName?: string;
    siteData?: SiteData;
}
export declare function createIndex(params: CreateIndexParams): PageData[];
export interface CreatePageParams {
    data: PageData;
    location: string;
    siteData?: SiteData;
}
export declare function createPage(params: CreatePageParams): PageData;
export declare function addSequenceLinks(pages: PageData[]): void;
export declare class SiteGenerator {
    private pages;
    private assets;
    private outDir;
    constructor(outDir: string);
    addPages(pages: PageData[], render: (data: PageData) => Promise<string>): void;
    addAssets(sourceDir: string, pattern: string): void;
    generate(): Promise<void>;
}
export {};
