/**
 * Created on 2017/6/8.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
'use strict';
const PATH = require('path');
const Router = require('koa-router');
const loader = require('dir-traverse');

let fileNamePattern = '[a-zA-Z\\d\\.\\-\\_]+';
let jsPattern = new RegExp(`^${fileNamePattern}\\.js$`);
let dirPattern = new RegExp(`^${fileNamePattern}$`);

let isRoot = group => group === 'root';

let metaConfigFilenames = ['meta-config.js', 'meta-config.json'];
let isMetaConfig = file => metaConfigFilenames.indexOf(file) >= 0;

let routePathPattern = /^([A-Z]+(\\,[A-Z]+)? )?\S+$/;
let checkRoutePath = route => {
    if (!routePathPattern.test(route)) {
        throw new Error(`malformed route: ${route}`);
    }
};

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

let getMapping = (configs, group, isRoot, filePath) => {
    let mapping = require(filePath)(configs);
    if (!mapping.meta && !mapping.routes) {
        mapping = {meta: {group}, routes: mapping};
    } else {
        mapping.meta = mapping.meta || {};
    }

    if (isRoot && mapping.meta.group && mapping.meta.group !== '') {
        throw new Error(`Unexpected group name '${mapping.meta.group}' in '/' (sub)root.`);
    }
    return mapping;
};

function addMapping (router, mapping) {
    for (let url in mapping) {
        if (mapping.hasOwnProperty(url)) {
            checkRoutePath(url);
            let route = mapping[url];
            let meta = {};
            if (route && typeof route !== 'function') {
                meta = route.meta || {};
                route = route.route;
            }
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

            paths.forEach(path => methods.forEach(method => !meta.ignore && router[method.toLowerCase()](path, route)));
        }
    }
}

function controllerLoader (App) {
    let {configs} = App;
    let baseDir = configs.dir;
    let dir = configs.controllerDir;
    let contextPath = configs.contextPath;

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

                    let mapping = getMapping(configs, group, _isRoot, fullPath);
                    let {meta, routes} = mapping;
                    meta.group = meta.group || group;

                    if (meta.ignore) {
                        return;
                    }
                    let child = new Router();
                    addMapping(child, routes);
                    router.use(meta.group, child.routes(), child.allowedMethods());
                    return;
                }

                if (isDirectory) {
                    checkDir(filename);
                    let metaFile = directory.findOneExists(metaConfigFilenames.map(file => PATH.join(fullPath, file)));
                    let meta = metaFile && require(metaFile);

                    if (meta.ignore) {
                        return;
                    }

                    let group = `/${meta && meta.group || filename}`;
                    let child = new Router();

                    addControllers(child, fullPath);

                    router.use(group, child.routes(), child.allowedMethods());
                }
            }
        };
        loader(dirPath, options);
    }

    let opts = {};
    if (contextPath) {
        if (!/^\//.test(contextPath)) {
            contextPath = `/${contextPath}`;
        }
        opts.prefix = contextPath;
    }
    let router = new Router(opts);
    addControllers(router, PATH.resolve(baseDir, dir));
    return router;
}

module.exports = controllerLoader;
