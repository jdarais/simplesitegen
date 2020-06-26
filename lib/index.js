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
exports.generatePages = exports.copyAssets = exports.SiteGenerator = exports.addSequenceLinks = exports.createPage = exports.createPageSequence = exports.createPagesFromFiles = void 0;
var glob = require("glob");
var async_1 = require("async");
var fs = require('fs');
var path = require('path');
var process = require('process');
var defaultSiteData = {
    baseUrl: '/'
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
function createPagesFromFiles(params) {
    var rootDir = params.rootDir, filePattern = params.filePattern, fileToData = params.fileToData, render = params.render, siteData = params.siteData;
    var getLocation = params.getLocation || getDefaultLocation;
    return new Promise(function (resolve, reject) {
        var cwd = rootDir !== undefined ? path.join(process.cwd(), rootDir) : process.cwd();
        glob(filePattern, { cwd: cwd }, function (err, matches) {
            if (err) {
                reject(err);
            }
            async_1.map(matches, function (match, cb) {
                var contents = fs.readFileSync(path.join(rootDir, match));
                fileToData(contents).then(function (data) {
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
                    cb(null, {
                        data: data,
                        render: render
                    });
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
function createPageSequence(params) {
    var data = params.data, render = params.render, siteData = params.siteData;
    var baseLocation = params.baseLocation;
    if (baseLocation[baseLocation.length - 1] != '/') {
        baseLocation = baseLocation + '/';
    }
    var fileName = params.fileName || 'index.html';
    var pageData = data.map(function (d) { return (__assign(__assign({}, d), { _meta: {}, _site: __assign(__assign({}, defaultSiteData), siteData) })); });
    pageData.forEach(function (d, i) {
        d._meta.location = d._site.baseUrl + baseLocation + (i > 0 ? i + "/" : '') + fileName;
        d._meta.link = getLinkFromLocation(d._meta.location);
    });
    var pages = pageData.map(function (d) { return ({
        data: d,
        render: render
    }); });
    addSequenceLinks(pages);
    return pages;
}
exports.createPageSequence = createPageSequence;
function createPage(params) {
    var data = params.data, render = params.render, location = params.location, siteData = params.siteData;
    var pageData = __assign(__assign({}, data), { _meta: {}, _site: __assign(__assign({}, defaultSiteData), siteData) });
    pageData._meta.location = pageData._site.baseUrl + location;
    pageData._meta.link = getLinkFromLocation(pageData._meta.location);
    return {
        data: pageData,
        render: render
    };
}
exports.createPage = createPage;
function addSequenceLinks(pages) {
    var numPages = pages.length;
    for (var i = 0; i < numPages; ++i) {
        pages[i].data._meta.prev = i > 0 ? pages[i - 1].data : null,
            pages[i].data._meta.next = i < numPages - 1 ? pages[i + 1].data : null;
    }
}
exports.addSequenceLinks = addSequenceLinks;
var SiteGenerator = /** @class */ (function () {
    function SiteGenerator(outDir) {
        this.pages = [];
        this.assets = [];
        this.outDir = outDir;
    }
    SiteGenerator.prototype.addPages = function (pages) {
        this.pages = this.pages.concat(pages);
    };
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
        async_1.each(assets, function (asset, cb) {
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
exports.copyAssets = copyAssets;
function generatePages(pages, outDir) {
    return new Promise(function (resolve, reject) {
        async_1.each(pages, function (page, cb) {
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
exports.generatePages = generatePages;
function createDir(dirPath, done) {
    var dirPathArr = dirPath.split(path.sep);
    var dirsToCreate = dirPathArr.map(function (_dir, i) { return dirPathArr.slice(0, i + 1).join(path.sep); });
    async_1.eachSeries(dirsToCreate, function (dir, cb) {
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
