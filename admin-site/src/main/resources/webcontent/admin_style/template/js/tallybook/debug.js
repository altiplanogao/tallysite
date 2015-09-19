;
var tallybook = tallybook || {};

(function ($, host) {
    var Debugger ={
        log : function(enabler /*param*/){
            if(enabler){
                var args = Array.prototype.slice.call(arguments, 1);
                console.log.call(console, args);
            }
        }
    }

    host.debug = Debugger;
})(jQuery, tallybook);

