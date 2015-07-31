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

    var Url={
        param:{
            string2Object:function(urlParams) {
                var paramObj = {};
                if ((urlParams != null) && ('' != urlParams)) {
                    paramObj =
                      JSON.parse('{"'
                      + decodeURI(encodeURI(urlParams.replace(/&/g, "\",\"").replace(/=/g, "\":\""))) + '"}');
                }
                return paramObj;
            },
            object2String:function(paramsObj, includeEmpty){
                var paramsUrl ='';
                for(k in paramsObj){
                    if(includeEmpty || paramsObj[k]){
                        paramsUrl += ('' + k + '=' + paramsObj[k] + '&');
                    }
                }
                var urlLen = paramsUrl.length;
                if(paramsUrl.length > 0){paramsUrl = paramsUrl.substring(0, urlLen - 1);}
                return paramsUrl;
            },
            mergeObjects: function(){
                var merged ={};
                for(i=0;i<arguments.length;i++){
                    var arg = arguments[i];
                    if(!!arg){
                        for(k in arg){
                            merged[k] = arg[k];
                        }}
                }
                return merged;
            },
            connect:function(){
                var merged ='';
                for(i=0;i<arguments.length;i++){
                    var node = arguments[i];
                    if(node){
                        merged += ('&' + node);
                    }
                }
                return (merged.startsWith('&')) ? merged.substring(1) : merged;
            }
        },

        getPath : function(url){
            return websanovaJsUrl('path', url);
        },
        getBaseUrl:function(baseUrl) {
            if (baseUrl == null) {
                baseUrl = window.location.href;
            }

            var indexOfQ = baseUrl.indexOf('?');
            var urlParams = null;
            if (indexOfQ >= 0) {
                baseUrl = baseUrl.substring(0, indexOfQ);
            }
            return baseUrl;
        },
        getParameter:function(baseUrl) {
            if (baseUrl == null) {
                baseUrl = window.location.href;
            }

            var indexOfQ = baseUrl.indexOf('?');
            var urlParams = null;
            if (indexOfQ >= 0) {
                urlParams = baseUrl.substring(indexOfQ + 1);
            }
            return urlParams;
        },
        getParametersObject : function(baseUrl) {
            return this.param.string2Object(this.getParameter(baseUrl));
        },

        getUrlWithParameter : function(param, value, state, baseUrl) {
            return this._getUrlWithParameter(param, value, null , state, baseUrl);
        },
        getUrlWithParameterObj : function(paramObj, state, baseUrl) {
            return this._getUrlWithParameter(null, null, paramObj , state, baseUrl);
        },
        getUrlWithParameterString : function(paramStr, state, baseUrl) {
            var paramObj = this.param.string2Object(paramStr);
            return this.getUrlWithParameterObj(paramObj , state, baseUrl);
        },
        _getUrlWithParameter : function(param, value, paramObj, state, baseUrl) {
            if (baseUrl == null) {
                baseUrl = window.location.href;
            }

            var indexOfQ = baseUrl.indexOf('?');
            var urlParams = null;
            if (indexOfQ >= 0) {
                urlParams = baseUrl.substring(indexOfQ + 1);
                baseUrl = baseUrl.substring(0, indexOfQ);
            }

            // Parse the current url parameters into an object
            var newParamObj = this.param.string2Object(urlParams);

            if (value == null || value === "") {
                delete newParamObj[param];
            } else {
                // Update the desired parameter to its new value
                if ($.isArray(param)) {
                    $(param).each(function(index, param) {
                        newParamObj[param[index]] = value[index];
                    });
                } else {
                    newParamObj[param] = value;
                }
            }
            newParamObj = this.param.mergeObjects(newParamObj, paramObj);

            // Reassemble the new url
            var paramStr = this.param.object2String(newParamObj);
            var newUrl = baseUrl;
            if(paramStr.length > 0){
                newUrl += ('?' + paramStr);
            }
            return newUrl;
        },

        connectUrl : function (/* optional paths */) {
            var segs  =Array.prototype.slice.call(arguments);
            var result = segs.reduce(function (prev, cur, index, array) {
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

})($,tallybook);