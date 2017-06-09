/**
 * Created on 2017/6/8.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
module.exports = App => ({
    'GET /': function (ctx, next) {
        ctx.body = ctx.url;
    }
});
