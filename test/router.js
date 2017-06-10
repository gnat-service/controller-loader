/**
 * Created on 2017/6/8.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
const loader = require('../router');
const assert = require('chai').assert;
const PATH = require('path');

const App = {
    configs: {
        dir: PATH.resolve(__dirname, '../'),
        controllerDir: 'test/mock/controllers',
        contextPath: 'app'
    }
};

describe('controller-loader', function () {
    it('execute', function () {
        let router = loader(App);
        assert.sameMembers(router.routes().router.stack.map(layer => layer.path), [
            '/1/2/path2/',
            '/1/2/path2/3',
            '/1/2/path2',
            '/1/2',
            '/1/path1/',
            //'/1/path1/3',
            '/1/path1',
            '/1/',
            '',
            '/1'
        ].map(url => url && `/app${url}` || url));
    });
});
