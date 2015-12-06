;
var tallybook = tallybook || {};

(function ($, host) {
  var ElementValueAccess = {
    getAndSet : function(_this, key, defVal, val, getcallback, setcallback) {
      var $ele = _this.element();
      var datakey = 'data-' + key;
      if (val === undefined) {/*get*/
        var existing = $ele.data(key);
        if($.isFunction(getcallback)){
          getcallback.apply(this,[]);
        }
        if (existing === undefined) {
          return defVal;
        } else {
          return existing;
        }
      } else {/*set*/
        if($.isFunction(setcallback)){
          setcallback.apply(this,[]);
        }
        if($.isPlainObject(val) || $.isArray(val)){
          $ele.attr(datakey, JSON.stringify(val));
        }else{$ele.attr(datakey, val);}
        $ele.data(key, val);
        return _this;
      }
    },
    /**
     * To use this method, the class should has method 'element()' returning jQuery html element
     * Use example:
     * Define a method as following
     *  TypeA.prototype = {
     *    element : function(){return $ele;},
     *    someproperty : ElementValueAccess.defineGetSet('someproperty', 'abc'),  ....
     *  }
     * Use it as:
     * var x = new TypeA();
     * x.someproperty('xyz'); //set the value
     * y = x.someproperty(); //get the value, return 'abc' by default
     *
     * @param key
     * @param defVal
     * @returns {Function}
     */
    defineGetSet : function( key, defVal, getcallback, setcallback){
      var fn = ElementValueAccess.getAndSet;

      return function(){
        var _newargs = [this, key, defVal];
        var newargs = _newargs.concat(Array.prototype.slice.call(arguments));
        return fn.apply(this, newargs);
      };
    },
    addGetSet : function (_this, key, data2Str, input2Data, isDataType, arrayMerger,
     op, val) {
      var $ele = _this.element();
      var datakey = 'data-' + key;
      var opidx = 6;
      var varidx = 7;
      if (op === undefined) {
        op = 'get';
      }
      switch (op) {
        case 'get': {
          var datas = $ele.data(key);
          var datasStr = $ele.attr(datakey);
          if ((!datas) && (!datasStr)) {
            return defVal;
          }
          if(datas)return datas;

          var dataStrs = datasStr.split(',');
          datas = [];
          dataStrs.forEach(function (item, index, array) {
            datas.push(input2Data(item));
          });
          $ele.data(key, datas);
          return datas;
        }
        case 'add': {
          if (val) {
            var method = arguments.callee;

            var getargs = Array.prototype.slice.call(arguments);
            getargs[opidx] = 'get';
            var getVal = method.apply(null, getargs);

            var normalargs = Array.prototype.slice.call(arguments);
            normalargs[opidx] = 'normal';
            normalargs[varidx] = val;
            var normalVal = method.apply(null, normalargs);

            var datas = [].concat(getVal).concat(normalVal.data);
            if(arrayMerger){
              var mergedData = arrayMerger(datas);
              datas = (mergedData || datas);
            }

            normalargs[varidx] = datas;
            normalVal = method.apply(null, normalargs);

            var setargs = Array.prototype.slice.call(arguments);
            setargs[opidx] = 'direct-set';
            setargs[varidx] = normalVal;
            return method.apply(null, setargs);
          }
        }
        case 'set': {
          if(val){
            var method = arguments.callee;

            var normalargs = Array.prototype.slice.call(arguments);
            normalargs[opidx] = 'normal';
            normalargs[varidx] = val;
            var normalVal = method.apply(null, normalargs);

            var setargs = Array.prototype.slice.call(arguments);
            setargs[opidx] = 'direct-set';
            setargs[varidx] = normalVal;
            return method.apply(null, setargs);
          }
        }
        case 'direct-set': {
          if(val){
            $ele.attr(datakey, val.dataStr);
            $ele.data(key, val.data);
          }else{
            $ele.attr(datakey, '');
            $ele.data(key, []);
          }
          return _this;
        }
        case 'normal':{
          var res = {data:[],dataStr:''};
          if(val){
            if(val instanceof Array){
              var datas = val.map(function (item,i) {
                if(isDataType(item))return item;
                return input2Data(item);
              });
              var dataStrs = datas.map(function (data, i) {
                return data2Str(data);
              })
              res = {data: datas, dataStr: dataStrs.join(',')};
            }else{
              if(isDataType(val)){
                return {data: [val], dataStr: data2Str(val)};
              }else{
                var data = input2Data(val);
                return {data:[data], dataStr: data2Str(data)};
              }
            }
          }
          return res;
        }
      }
    },
    /**
     *
     * @param key
     * @param valType: 2 options:
     * 1. the string value 'string' indicates the value type is string;
     * 2. a function indicates the value type's constructor,
     *      the type's constructor should be able to accept a string parameter
     *      the type should contains a method toString()
     * @returns {Function}
     */
    defineArrayAddGetSet : function(key, valType, arrayMerger){
      var fn = ElementValueAccess.addGetSet;
      var data2Str = function (data) {
        return data;
      }
      var input2Data = data2Str;
      var _isDataType = function (data) {
        return true;
      }
      if(valType == 'string'){
      }else{
        data2Str = function (data) {
          return data.toString();
        }
        input2Data = function (str) {
          return new valType(str);
        }
        _isDataType = function(data){
          data instanceof valType;
        }
      }
      return function(){
        var _newargs = [this, key, data2Str, input2Data, _isDataType, arrayMerger];
        var newargs = _newargs.concat(Array.prototype.slice.call(arguments));
        return fn.apply(this, newargs);
      };

    }
  };

  host.messages = $('div.message-dict p').data('message-dict');
  host.elementValueAccess = ElementValueAccess;
})(jQuery, tallybook)
;