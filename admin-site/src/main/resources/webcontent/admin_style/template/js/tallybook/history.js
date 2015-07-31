/**
 * Created by Gao Yuan on 2015/6/19.
 */
  ;
var tallybook;
if(!tallybook)
    tallybook={};

(function($, host){
    var requestParameterStartIndex="startIndex";
    var requestParameterMaxResultCount="maxCount";
    var requestParameterSortPrefix="sort_";
    var requestParameterSortAsc="asc";
    var requestParameterSortDesc="desc";

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

    host.url = Url;
    host.history = History;

})($,tallybook);