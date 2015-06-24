/**
 * Created by Gao Yuan on 2015/6/6.
 */
;(function($, window, undefined) {
    'use strict';
    $.fn.menuAccordionInit = function (options){
        var initMenu = function(){
            ($('nav > ul.nav-menu > li.menu-group > .menu-group-title')).on('click', function(){
                $(this).parent('li.menu-group').toggleClass("active");
            });
        }

        initMenu();
    }
})(jQuery, this);