/**
 * Created by Gao Yuan on 2015/6/19.
 */
  ;
var tallybook = tallybook || {};

(function($, host){
    var requestParameterStartIndex="startIndex";
    var requestParameterMaxResultCount="maxCount";
    var requestParameterSortPrefix="sort_";
    var requestParameterSortAsc="asc";
    var requestParameterSortDesc="desc";

    //url parser from https://github.com/websanova/js-url
    var websanovaJsUrl = (function() {
        function isNumeric(arg) {
            return !isNaN(parseFloat(arg)) && isFinite(arg);
        }

        function decode(str) {
            return decodeURIComponent(str.replace(/\+/g, ' '));
        }

        return function(arg, url) {
            var _ls = url || window.location.toString();

            if (!arg) { return _ls; }
            else { arg = arg.toString(); }

            if (_ls.substring(0,2) === '//') { _ls = 'http:' + _ls; }
            else if (_ls.split('://').length === 1) { _ls = 'http://' + _ls; }

            url = _ls.split('/');
            var _l = {auth:''}, host = url[2].split('@');

            if (host.length === 1) { host = host[0].split(':'); }
            else { _l.auth = host[0]; host = host[1].split(':'); }

            _l.protocol=url[0];
            _l.hostname=host[0];
            _l.port=(host[1] || ((_l.protocol.split(':')[0].toLowerCase() === 'https') ? '443' : '80'));
            _l.pathname=( (url.length > 3 ? '/' : '') + url.slice(3, url.length).join('/').split('?')[0].split('#')[0]);
            var _p = _l.pathname;

            if (_p.charAt(_p.length-1) === '/') { _p=_p.substring(0, _p.length-1); }
            var _h = _l.hostname, _hs = _h.split('.'), _ps = _p.split('/');

            if (arg === 'hostname') { return _h; }
            else if (arg === 'domain') {
                if (/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/.test(_h)) { return _h; }
                return _hs.slice(-2).join('.');
            }
            //else if (arg === 'tld') { return _hs.slice(-1).join('.'); }
            else if (arg === 'sub') { return _hs.slice(0, _hs.length - 2).join('.'); }
            else if (arg === 'port') { return _l.port; }
            else if (arg === 'protocol') { return _l.protocol.split(':')[0]; }
            else if (arg === 'auth') { return _l.auth; }
            else if (arg === 'user') { return _l.auth.split(':')[0]; }
            else if (arg === 'pass') { return _l.auth.split(':')[1] || ''; }
            else if (arg === 'path') { return _l.pathname; }
            else if (arg.charAt(0) === '.')
            {
                arg = arg.substring(1);
                if(isNumeric(arg)) {arg = parseInt(arg, 10); return _hs[arg < 0 ? _hs.length + arg : arg-1] || ''; }
            }
            else if (isNumeric(arg)) { arg = parseInt(arg, 10); return _ps[arg < 0 ? _ps.length + arg : arg] || ''; }
            else if (arg === 'file') { return _ps.slice(-1)[0]; }
            else if (arg === 'filename') { return _ps.slice(-1)[0].split('.')[0]; }
            else if (arg === 'fileext') { return _ps.slice(-1)[0].split('.')[1] || ''; }
            else if (arg.charAt(0) === '?' || arg.charAt(0) === '#')
            {
                var params = _ls, param = null;

                if(arg.charAt(0) === '?') { params = (params.split('?')[1] || '').split('#')[0]; }
                else if(arg.charAt(0) === '#') { params = (params.split('#')[1] || ''); }

                if(!arg.charAt(1)) { return (params ? decode(params) : params); }

                arg = arg.substring(1);
                params = params.split('&');

                for(var i=0,ii=params.length; i<ii; i++)
                {
                    param = params[i].split('=');
                    if(param[0] === arg) { return (param[1] ? decode(param[1]) : param[1]) || ''; }
                }

                return null;
            }

            return '';
        };
    })();

    var UrlParams = {
        stringToData : function (paramsStr, keepEmpty /*keep keys with null value*/) {
            var obj = {};
            keepEmpty = (keepEmpty == undefined ? false : !!keepEmpty);
            for (var member in obj) delete obj[member];
            if((paramsStr == null) || (paramsStr == '')){return obj;}
            var pathAndParam = paramsStr.split('?');
            var params = (pathAndParam.length == 2)?pathAndParam[1]:pathAndParam[0];
            var pairs = params.split('&');
            pairs.forEach(function(pair, i, array){
                var kv = pair.split('='); var k = kv[0]; var v = kv[1];
                if(keepEmpty || (v != '')){
                    if(obj[k] == undefined){obj[k] = [];}
                    if(v != ''){obj[k].push(v);}
                }
            });
            return obj;
        },
        dataToString : function (obj, includeEmpty) {
            var paramsUrl ='';
            var pairs = [];
            for(k in obj){
                var vs = obj[k];
                if(includeEmpty || vs){
                    vs.forEach(function(v, i){
                        pairs.push(''+k+'='+v);
                    });
                }
            }
            return pairs.join('&');
          },
        addValue : function (obj, k, v) {
            if(obj[k] == undefined){obj[k] = [];}
            obj[k].push(v);
        },
        setValue : function (obj, k, v) {
            obj[k] = [v];
        },
        hasKey : function (obj, k) {
            var v = obj[k];
            return ($.isArray(v)) && (v.length > 0);
        },
        deleteKey : function (obj, k) {
            delete obj[k];
        },
        /**
         * remove duplicated kv pairs
         * http://xxx.com/abc?a=1&b=2&b=2&b=3 -> http://xxx.com/abc?a=1&b=2&b=3
         * @param paramObj
         */
        removeDuplicates : function (obj) {
            for(k in obj){
                var vs = obj[k]; var vo ={}; var ovs=[];
                vs.forEach(function (v, i) {vo[v]=0;})
                for(v in vo){ovs.push(v);}
                obj[k]=ovs;
            }
        },
        merge : function(){
            var merged ={};
            for(i=0;i<arguments.length;i++){
                var obj = arguments[i];
                if(typeof obj == 'string'){
                    obj = UrlParams.stringToData(obj);
                }
                if(!!obj){
                    for(k in obj){
                        var vs = obj[k]; var mvs = merged[k];
                        merged[k] = ((!!mvs)? (mvs.concat(vs)) : ([].concat(vs)));
                    }}
            }
            UrlParams.removeDuplicates(merged);
            return merged;
          },
        mergeAsString : function(){
            var merged = UrlParams.merge.apply(null, arguments);
            return UrlParams.dataToString(merged);
        }
    };
    var Url={
        param: $.extend({}, UrlParams, {
            connect:function(){
                //var merged  =Array.prototype.slice.call(arguments);
                var merged =[];
                for(i=0;i<arguments.length;i++){
                    var node = arguments[i];
                    if(node){//ignore empty
                        merged.push(node);
                    }
                }
                return merged.join('&');
            }
        }),

        getPath : function(url){
            return websanovaJsUrl('path', url);
        },
        getParameter:function(url) {
            url = url || window.location.href;
            return websanovaJsUrl('?', url);
        },
        getParametersObject : function(url) {
            return this.param.stringToData(this.getParameter(url));
        },

        getUrlWithParameter : function(param, value, state, url) {
            return this._getUrlWithParameter(param, value, null , state, url);
        },
        getUrlWithParameterObj : function(paramObj, state, url) {
            return this._getUrlWithParameter(null, null, paramObj , state, url);
        },
        getUrlWithParameterString : function(paramStr, state, url) {
            var paramObj = this.param.stringToData(paramStr);
            return this.getUrlWithParameterObj(paramObj , state, url);
        },
        _getUrlWithParameter : function(param, value, paramObj, state, url) {
            url = url || window.location.href;

            var urlAndParams = url.split('?');
            var baseUrl = urlAndParams[0];
            var urlParams = urlAndParams[1];

            // Parse the current url parameters into an object
            var newParamObj = this.param.stringToData(urlParams);

            if (value == null || value === "") {
                UrlParams.deleteKey(newParamObj, param);
            } else {
                // Update the desired parameter to its new value
                if ($.isArray(param)) {
                    $(param).each(function(index, param) {
                        var k = param[index]; var v = value[index];
                        UrlParams.setValue(newParamObj,k,v);
                    });
                } else {
                    UrlParams.setValue(newParamObj,param,value);
                }
            }
            newParamObj = this.param.merge(newParamObj, paramObj);

            // Reassemble the new url
            var paramStr = this.param.dataToString(newParamObj);
            if('' == paramStr)return baseUrl;
            return [baseUrl, paramStr].join('?');
        },

        connectUrl : function (/* optional paths */) {
            var segs  =Array.prototype.slice.call(arguments);
            var result = segs.reduce(function (prev, cur, index, array) {
                if(cur == null) cur = '';
                if(typeof(cur) != 'string') cur = cur.toString();
                if(cur == null || ('' == cur)){return prev;}
                if(prev == null || ('' == prev)){return cur;}
                var slash = (prev.endsWith('/')?1:0) +(cur.startsWith('/')?1:0);
                if(slash == 0)cur='/'+cur;
                else if(slash == 2)cur = cur.substring(1);
                return prev + cur;
            });
            return result;
        }

    };

    var History ={

        pushUrl : function(url, state) {
            
        },
            
        replaceUrl : function(url, state) {
            // Assuming the user is on a browser from the 21st century, update the url
            if (!!(window.history && history.pushState)) {
                history.replaceState(state, '', url);
            }
        },

        replaceUrlParameter : function(param, value, state) {
            var newUrl = Url.getUrlWithParameter(param, value, state);
            this.replaceUrl(newUrl, state);
        }
    };

    host.location = Location;
    host.url = Url;
    host.history = History;

})(jQuery,tallybook);