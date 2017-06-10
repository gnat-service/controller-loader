/**
 * Created on 2017/6/8.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
const PATH = require('path');
const Router = require('koa-router');
const loader = require('dir-traverse');

let contextPath = '';
let controllerDir = '';
let fileNamePattern = '[a-zA-Z\\d\\.\\-\\_]+';
let jsPattern = new RegExp(`^${fileNamePattern}\\.js$`);
let dirPattern = new RegExp(`^${fileNamePattern}$`);
let baseDir = __dirname;
let App;

let routePathPattern = /^([A-Z]+(\\,[A-Z]+)? )?\S+$/;
let checkRoutePath = route => {
    if (!routePathPattern.test(route)) {
        throw new Error(`malformed route: ${route}`);
    }
};

let getMapping = (group, isRoot, filePath) => {
    let mapping = require(filePath)(App);
    if (!mapping.meta && !mapping.routes) {
        mapping = {meta: {group}, routes: mapping};
    } else {
        mapping.meta = mapping.meta || {};
    }

    if (isRoot && mapping.meta.group && mapping.meta.group !== '') {
        throw new Error(`Unexpected group name "${mapping.meta.group}" in "/" (sub)root.`);
    }
    return mapping;
};

function addMapping (router, mapping) {
    for (let url in mapping) {
        if (mapping.hasOwnProperty(url)) {
            checkRoutePath(url);
            let route = mapping[url];
            let patterns = url.split(/\s+/);
            let paths, methods;
            if (patterns.length === 1) {
                methods = 'ALL';
                paths = patterns[0];
            } else if (patterns.length > 1) {
                [methods, paths] = patterns;
            }

            methods = methods.split(',');
            paths = paths.split(',');

            paths.forEach(path => methods.forEach(method => router[method.toLowerCase()](path, route)));
        }
    }
}

let checkJs = function (file) {
    if (!jsPattern.test(file)) {
        throw new Error(`malformed controller file name: ${file}`);
    }
};

let checkDir = function (dir) {
    if (!dirPattern.test(dir)) {
        throw new Error(`malformed controller dir name: ${dir}`);
    }
};

let isRoot = group => group === 'root';

let metaConfigFilenames = ['meta-config.js', 'meta-config.json'];
let isMetaConfig = file => metaConfigFilenames.indexOf(file) >= 0;

function addControllers (router, dirPath) {
    let options = {
        filter: file => !isMetaConfig(file),
        router,
        handler: ({directory, filename, fullPath, isFile, isDirectory}) => {
            if (isFile && filename.endsWith('.js')) {
                checkJs(filename);
                let name = PATH.parse(filename).name;
                let _isRoot = isRoot(name);
                let group = `/${name}`;
                if (_isRoot) {
                    group = '';
                }

                let mapping = getMapping(group, _isRoot, fullPath);
                let {meta, routes} = mapping;
                meta.group = meta.group || group;

                let child = new Router();
                addMapping(child, routes);
                return router.use(meta.group, child.routes(), child.allowedMethods());
            }

            if (isDirectory) {
                checkDir(filename);
                let metaFile = directory.findOneExists(metaConfigFilenames.map(file => PATH.join(fullPath, file)));
                let meta = metaFile && require(metaFile);

                let group = `/${meta && meta.group || filename}`;
                let child = new Router();

                addControllers(child, fullPath);

                router.use(group, child.routes(), child.allowedMethods());
            }
        }
    };
    loader(dirPath, options);
}

function controllerLoader (_App, dir = 'controllers', _contextPath = '') {
    App = _App;
    baseDir = _App.dir;
    controllerDir = dir;
    contextPath = _contextPath;
    let opts = {};
    if (contextPath) {
        if (!/^\//.test(contextPath)) {
            contextPath = `/${contextPath}`;
        }
        opts.prefix = contextPath;
    }
    let router = new Router(opts);
    addControllers(router, PATH.join(PATH.resolve(baseDir, controllerDir)));
    return router;
}

module.exports = controllerLoader;
