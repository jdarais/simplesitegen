export declare const parseMarkdown: any;
declare type PageData = any;
declare type SiteData = any;
/**
 * Group objects using a given criteria
 * @param arr The objects to be grouped
 * @param groupAssignment Function to assign an object to a group.  If an array is returned, the object will appear in multiple groups
 */
export declare function createGroups<T, G>(arr: Array<T>, groupAssignment: (item: T) => G | Array<G>): Map<G, Array<T>>;
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
export declare function createPagesFromFiles(params: CreatePagesFromFilesParams): Promise<PageData[]>;
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
export declare function createPageSequence(params: CreatePageSequenceParams): PageData[];
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
export declare function createIndex(params: CreateIndexParams): PageData[];
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
export declare function createPage(params: CreatePageParams): PageData;
/**
 * Add _meta.prev and _meta.next attributes to each of the pages in the array to link them together
 * @param pages {PageData[]} The sequence of pages to link
 */
export declare function addSequenceLinks(pages: PageData[]): void;
/**
 * Primary object for generating a static site
 */
export declare class SiteGenerator {
    private pages;
    private assets;
    private outDir;
    /**
     *
     * @param outDir {string} Directory in which to generate the static site
     */
    constructor(outDir: string);
    /**
     * Add pages to the site, which will be generated when the 'generate()' function is called
     * @param pages {PageData[]} An array of one or more PageData objects that will be used to generate sites.  One page will be generated for each PageData in the array.
     * @param render {(data: PageData) => Promise<string>} The render function to use to generate a page
     */
    addPages(pages: PageData[], render: (data: PageData) => Promise<string>): void;
    /**
     * Add static assets to the site, which will be copied over when the 'generate()' function is called.
     * The location of the asset in the generated site will be the relative path of the file from 'sourceDir'.
     * @param sourceDir {string} The source directory to copy files from
     * @param pattern {string} Glob pattern to match files.  Matched files will be copied.
     */
    addAssets(sourceDir: string, pattern: string): void;
    /**
     * Generate the site
     */
    generate(): Promise<void>;
}
export {};
