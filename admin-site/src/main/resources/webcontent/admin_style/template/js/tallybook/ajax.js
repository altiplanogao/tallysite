;
var tallybook = tallybook || {};

(function ($, host) {
  function getCsrfToken() {
    var csrfTokenInput = $('input[name="csrfToken"]');
    if (csrfTokenInput.length == 0) {
      return null;
    }

    return csrfTokenInput.val();
  }

  function ajax(options, callback){
    var mOpts = $.extend({}, options, $.isPlainObject(callback)?callback:null);
    if($.isFunction(callback)) {mOpts.success = callback;}

    if(mOpts.type==null){
      mOpts.type='GET';
    }
    if (mOpts.type.toUpperCase() == 'POST') {
      var csrfTokenKey = 'csrfToken';
      if(typeof mOpts.data == 'string'){
        var data = host.param.stringToData(mOpts.data);
        host.param.addValue(data, csrfTokenKey,getCsrfToken());
        mOpts.data = host.param.dataToString(data);
      }else if (typeof mOpts.data == 'object'){
        host.param.addValue(mOpts.data, csrfTokenKey,getCsrfToken());
      }else if(!mOpts.data){
        mOpts.data = {};
        host.param.addValue(mOpts.data, csrfTokenKey,getCsrfToken());
      }
    }

    if(!mOpts.success.enhanced){
      var oldSuccess = mOpts.success;
      var newSuccess = function(data, textStatus, jqXHR){
        oldSuccess(data, textStatus, jqXHR);
      };
      newSuccess.enhanced = true;
      mOpts.success = newSuccess;
    }
    mOpts.error = mOpts.error ? mOpts.error : function(){};

    if(!mOpts.error.enhanced){
      var oldError = mOpts.error;
      var newError = function(jqXHR, textStatus, errorThrown){
        oldError(jqXHR, textStatus, errorThrown);
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
