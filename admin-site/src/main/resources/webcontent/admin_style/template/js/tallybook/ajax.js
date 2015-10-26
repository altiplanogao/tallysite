;
var tallybook = tallybook || {};

(function ($, host) {
  function getCsrfToken() {
    var csrfTokenInput = $('input[name="_csrf"]');
    if (csrfTokenInput.length == 0) {
      return null;
    }

    return csrfTokenInput.val();
  }

  var AJAX_DEFAULT_OPTIONS={
    handleRedirect : true,
    skipAjaxDefaultHandler : false
  }

  function preSuccessHandler(data, textStatus, jqXHR, opts){
    if('true' == jqXHR.getResponseHeader('loginpage')){
      location.reload();
      opts.skipAjaxDefaultHandler = true;
      return;
    }

  }
  function postSuccessHandler(data, textStatus, jqXHR, opts){
    if(opts.skipAjaxDefaultHandler)
      return;

    if(typeof data == "object"){
      var operation = data.operation;
      if(opts.handleRedirect){
        if(operation == 'redirect'){
          window.location.replace(data.url);
        }
      }
    }
  }
  function preErrorHandler(jqXHR, textStatus, errorThrown, opts){

  }
  function postErrorHandler(jqXHR, textStatus, errorThrown, opts){

  }

  function ajax(options, callback){
    var mOpts = $.extend({}, AJAX_DEFAULT_OPTIONS, options, $.isPlainObject(callback)?callback:null);
    if($.isFunction(callback)) {mOpts.success = callback;}

    mOpts.type = mOpts.type || 'GET';
    mOpts.error = mOpts.error || function(){};

    if(!mOpts.success.enhanced){
      var oldSuccess = mOpts.success;
      var newSuccess = function(data, textStatus, jqXHR){
        preSuccessHandler(data, textStatus, jqXHR, mOpts);
        if(!mOpts.skipAjaxDefaultHandler){
          oldSuccess(data, textStatus, jqXHR, mOpts);
        }
        if(!mOpts.skipAjaxDefaultHandler){
          postSuccessHandler(data, textStatus, jqXHR, mOpts);
        }
      };
      newSuccess.enhanced = true;
      mOpts.success = newSuccess;
    }

    if(!mOpts.error.enhanced){
      var oldError = mOpts.error;
      var newError = function(jqXHR, textStatus, errorThrown){
        preErrorHandler(jqXHR, textStatus, errorThrown, mOpts);
        if(!mOpts.skipAjaxDefaultHandler){
          oldError(jqXHR, textStatus, errorThrown, mOpts);
        }
        if(!mOpts.skipAjaxDefaultHandler){
          postErrorHandler(jqXHR, textStatus, errorThrown, mOpts);
        }
      }
      newError.enhanced = true;
      mOpts.error = newError;
    };

    return $.ajax(mOpts);
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

})(jQuery, tallybook);
