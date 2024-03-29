"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteGenerator = exports.addSequenceLinks = exports.createPage = exports.createIndex = exports.createPageSequence = exports.createPagesFromFiles = exports.createGroups = exports.parseMarkdown = void 0;
var glob = require("glob");
var async_1 = require("async");
var _ = require("underscore");
var fs = require("fs");
var path = require("path");
var process = require("process");
exports.parseMarkdown = require('./markdown').parseMarkdown;
var defaultSiteData = {
    baseUrl: '/'
};
var ensureEndsWithSlash = function (url) {
    return url[url.length - 1] === '/' ? url : url + '/';
};
var getDefaultLocation = function (data) {
    return data._site.baseUrl
        + path.join(data._meta.fileDir, data._meta.fileName).split(path.sep).join('/') + '/index.html';
};
var getLinkFromLocation = function (location) {
    var result = /(.*\/)index.html$/.exec(location);
    if (result) {
        return result[1];
    }
    else {
        return location;
    }
};
/**
 * Group objects using a given criteria
 * @param arr The objects to be grouped
 * @param groupAssignment Function to assign an object to a group.  If an array is returned, the object will appear in multiple groups
 */
function createGroups(arr, groupAssignment) {
    var groups = new Map();
    arr.forEach(function (item) {
        var group = groupAssignment(item);
        var groupArr = Array.isArray(group) ? group : [group];
        groupArr.forEach(function (g) {
            if (!groups.has(g)) {
                groups.set(g, []);
            }
            groups.get(g).push(item);
        });
    });
    return groups;
}
exports.createGroups = createGroups;
/**
 * Generate PageData objects from files
 * @param params
 */
function createPagesFromFiles(params) {
    var rootDir = params.rootDir, filePattern = params.filePattern, fileToData = params.fileToData, siteData = params.siteData;
    var getLocation = params.getLocation || getDefaultLocation;
    return new Promise(function (resolve, reject) {
        var cwd = rootDir !== undefined ? path.join(process.cwd(), rootDir) : process.cwd();
        glob(filePattern, { cwd: cwd }, function (err, matches) {
            if (err) {
                reject(err);
            }
            (0, async_1.map)(matches, function (match, cb) {
                var contents = fs.readFileSync(path.join(rootDir, match));
                fileToData(contents.toString()).then(function (data) {
                    var filePath = path.parse(match);
                    data._meta = {
                        filePath: match,
                        fileName: filePath.name,
                        fileDir: filePath.dir,
                        fileExt: filePath.ext
                    };
                    data._site = __assign(__assign({}, defaultSiteData), siteData);
                    data._meta.location = getLocation(data);
                    data._meta.link = getLinkFromLocation(data._meta.location);
                    cb(null, data);
                });
            }, function (err, pages) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(pages);
                }
            });
        });
    });
}
exports.createPagesFromFiles = createPagesFromFiles;
/**
 * Creates PageData objects, and automatically adds _meta.prev and _meta.next attributes to link the pages in the sequence.
 * @param params
 */
function createPageSequence(params) {
    var data = params.data, siteData = params.siteData;
    var baseLocation = (params.baseLocation.length === 0 || params.baseLocation === '/') ?
        '' :
        ensureEndsWithSlash(params.baseLocation);
    var fileName = params.fileName || 'index.html';
    var pageData = data.map(function (d) { return (__assign(__assign({}, d), { _meta: {}, _site: __assign(__assign({}, defaultSiteData), siteData) })); });
    pageData.forEach(function (d, i) {
        d._meta.location = d._site.baseUrl + baseLocation + (i > 0 ? "".concat(i, "/") : '') + fileName;
        d._meta.link = getLinkFromLocation(d._meta.location);
    });
    addSequenceLinks(pageData);
    return pageData;
}
exports.createPageSequence = createPageSequence;
/**
 * Create an index page for a list of pages.  This can be used to create an index page for all posts in a blog, or a tag or category archive.
 * @param params
 */
function createIndex(params) {
    var pages = params.pages, createIndexPageData = params.createIndexPageData, siteData = params.siteData;
    var baseLocation = (params.baseLocation.length === 0 || params.baseLocation === '/') ?
        '' :
        ensureEndsWithSlash(params.baseLocation);
    var itemsPerPage = params.itemsPerPage !== undefined ? params.itemsPerPage : pages.length;
    var fileName = params.fileName || 'index.html';
    var indexPagesData = _.chunk(pages, itemsPerPage).map(createIndexPageData);
    indexPagesData.forEach(function (indexPageData, i) {
        indexPageData._site = __assign(__assign({}, defaultSiteData), siteData);
        var location = indexPageData._site.baseUrl + baseLocation + (i > 0 ? "".concat(i, "/") : '') + fileName;
        indexPageData._meta = {
            location: location,
            link: getLinkFromLocation(location)
        };
    });
    addSequenceLinks(indexPagesData);
    return indexPagesData;
}
exports.createIndex = createIndex;
/**
 * Create a page.  This essentially attaches appropriate _meta and _site attributes to the object
 * @param params
 */
function createPage(params) {
    var data = params.data, location = params.location, siteData = params.siteData;
    var pageData = __assign(__assign({}, data), { _meta: {}, _site: __assign(__assign({}, defaultSiteData), siteData) });
    pageData._meta.location = pageData._site.baseUrl + location;
    pageData._meta.link = getLinkFromLocation(pageData._meta.location);
    return pageData;
}
exports.createPage = createPage;
/**
 * Add _meta.prev and _meta.next attributes to each of the pages in the array to link them together
 * @param pages {PageData[]} The sequence of pages to link
 */
function addSequenceLinks(pages) {
    var numPages = pages.length;
    for (var i = 0; i < numPages; ++i) {
        pages[i]._meta.prev = i > 0 ? pages[i - 1] : null,
            pages[i]._meta.next = i < numPages - 1 ? pages[i + 1] : null;
    }
}
exports.addSequenceLinks = addSequenceLinks;
/**
 * Primary object for generating a static site
 */
var SiteGenerator = /** @class */ (function () {
    /**
     *
     * @param outDir {string} Directory in which to generate the static site
     */
    function SiteGenerator(outDir) {
        this.pages = [];
        this.assets = [];
        this.outDir = outDir;
    }
    /**
     * Add pages to the site, which will be generated when the 'generate()' function is called
     * @param pages {PageData[]} An array of one or more PageData objects that will be used to generate sites.  One page will be generated for each PageData in the array.
     * @param render {(data: PageData) => Promise<string>} The render function to use to generate a page
     */
    SiteGenerator.prototype.addPages = function (pages, render) {
        this.pages = this.pages.concat(pages.map(function (data) { return ({ data: data, render: render }); }));
    };
    /**
     * Add static assets to the site, which will be copied over when the 'generate()' function is called.
     * The location of the asset in the generated site will be the relative path of the file from 'sourceDir'.
     * @param sourceDir {string} The source directory to copy files from
     * @param pattern {string} Glob pattern to match files.  Matched files will be copied.
     */
    SiteGenerator.prototype.addAssets = function (sourceDir, pattern) {
        var _this = this;
        var matches = glob.sync(pattern, { cwd: sourceDir });
        matches.forEach(function (match) {
            if (!fs.statSync(path.join(sourceDir, match)).isDirectory()) {
                _this.assets.push({
                    basePath: sourceDir,
                    path: match
                });
            }
        });
    };
    /**
     * Generate the site
     */
    SiteGenerator.prototype.generate = function () {
        var _this = this;
        return generatePages(this.pages, this.outDir).then(function () {
            return copyAssets(_this.assets, _this.outDir);
        });
    };
    return SiteGenerator;
}());
exports.SiteGenerator = SiteGenerator;
function copyAssets(assets, outDir) {
    return new Promise(function (resolve, reject) {
        (0, async_1.each)(assets, function (asset, cb) {
            var fullSourcePath = path.join(asset.basePath, asset.path);
            var fileContents = fs.readFileSync(fullSourcePath);
            var outPath = path.join(outDir, asset.path);
            createDir(path.dirname(outPath), function (err) {
                if (err) {
                    reject(err);
                    return;
                }
                fs.writeFile(outPath, fileContents, cb);
            });
        }, function (err) {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}
function generatePages(pages, outDir) {
    return new Promise(function (resolve, reject) {
        (0, async_1.each)(pages, function (page, cb) {
            page.render(page.data).then(function (renderedContent) {
                var outPath = path.join(outDir, page.data._meta.location);
                createDir(path.dirname(outPath), function (err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    fs.writeFile(outPath, renderedContent, cb);
                });
            });
        }, function (err) {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}
function createDir(dirPath, done) {
    var dirPathArr = dirPath.split(path.sep);
    var dirsToCreate = dirPathArr.map(function (_dir, i) { return dirPathArr.slice(0, i + 1).join(path.sep); });
    (0, async_1.eachSeries)(dirsToCreate, function (dir, cb) {
        fs.mkdir(dir, { recursive: true }, function (err) {
            // Only pass along the error if it's not that the directory already exists
            if (err && err.code !== 'EEXIST') {
                cb(err);
                return;
            }
            cb();
        });
    }, done);
}
