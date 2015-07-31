;
var tallybook = tallybook || {};

(function ($, host) {
  function ajax(options, callback){
    if(options==null){
      options ={};
    }
    if(options.type==null){
      options.type='GET';
    }
    options.success = function (data) {
      callback(data);
    }
    return $.ajax(options);
  }
  ajax.get = function(options, callback){
    if(options==null){
      options ={};
    }
    options.type='GET';
    return ajax(options, callback);
  }
  ajax.post = function(options, callback){
    if(options==null){
      options ={};
    }
    options.type='POST';
    return ajax(options, callback);
  }
  ajax.ajax = ajax;

  host.ajax = ajax;

})($, tallybook);
