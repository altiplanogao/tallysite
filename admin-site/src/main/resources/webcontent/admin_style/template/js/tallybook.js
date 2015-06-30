/**
 * Created by Gao Yuan on 2015/6/19.
 */
;
var tallybook = (function($){
    var requestParameterStartIndex="startIndex";
    var requestParameterMaxResultCount="maxCount";
    var requestParameterSortPrefix="sort_";
    var requestParameterSortAsc="asc";
    var requestParameterSortDesc="desc";

    var history ={
        getUrlWithParameter : function(param, value, state, baseUrl) {
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
            var paramObj = {};
            if (urlParams != null) {
                paramObj = JSON.parse('{"'
                + decodeURI(encodeURI(urlParams.replace(/&/g, "\",\"").replace(/=/g,"\":\""))) + '"}');

            }

            if (value == null || value === "") {
                delete paramObj[param];
            } else {
                // Update the desired parameter to its new value
                if ($.isArray(param)) {
                    $(param).each(function(index, param) {
                        paramObj[param[index]] = value[index];
                    });
                } else {
                    paramObj[param] = value;
                }
            }

            // Reassemble the new url
            var newUrl = baseUrl + '?';
            for (i in paramObj) {
                if (paramObj[i] != null) {
                    newUrl += i + '=' + paramObj[i] + '&';
                }
            }
            newUrl = newUrl.substring(0, newUrl.length-1);

            return newUrl;
        },

        getUrlParameters : function() {
            var baseUrl = window.location.href;
            var indexOfQ = baseUrl.indexOf('?');
            var urlParams = null;
            if (indexOfQ >= 0) {
                urlParams = baseUrl.substring(indexOfQ + 1);
                return JSON.parse('{"'
                + decodeURI(encodeURI(urlParams.replace(/&/g, "\",\"").replace(/=/g,"\":\""))) + '"}');
            }
            return null;
        },

        replaceUrlParameter : function(param, value, state) {
            var newUrl = this.getUrlWithParameter(param, value, state);
            this.replaceUrl(newUrl, state);
        }
    };

    return {
        history : history
    }

})($);