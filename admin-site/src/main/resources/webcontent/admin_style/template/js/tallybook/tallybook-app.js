/**
 * Created by Gao Yuan on 2015/6/22.
 */
;
var TallyBookApp = (function($){
    var initializationHandlers = [];

    return {
        addInitializationHandler : function(fn) {
            initializationHandlers.push(fn);
        },

        initializeFields : function($container) {
            if ($container.data('initialized') == 'true') {
                return;
            }

            for (var i = 0; i < initializationHandlers.length; i++) {
                initializationHandlers[i]($container);
            }

            // Mark this container as initialized
            $container.data('initialized', 'true');
        }
    };

})(jQuery);

