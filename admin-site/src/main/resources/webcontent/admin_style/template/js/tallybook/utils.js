;
var tallybook = tallybook || {};

(function ($, host) {
  var ElementValueAccess = {
    getAndSet : function(_this, key, defVal, val) {
      var $ele = _this.element();
      var datakey = 'data-' + key;
      if (val === undefined) {/*get*/
        var existing = $ele.data(key);
        if (existing === undefined) {
          return defVal;
        } else {
          return existing;
        }
      } else {/*set*/
        $ele.attr(datakey, val);
        $ele.data(key, val);
        return _this;
      }
    },
    defineGetSet : function( key, defVal){
      var fn = ElementValueAccess.getAndSet;

      return function(){
        var _newargs = [this, key, defVal];
        var newargs = _newargs.concat(Array.prototype.slice.call(arguments));
        return fn.apply(this, newargs);
      };
    }
  };

  host.messages = $('div.message-dict p').data('message-dict');
  host.elementValueAccess = ElementValueAccess;
})(jQuery, tallybook)
;