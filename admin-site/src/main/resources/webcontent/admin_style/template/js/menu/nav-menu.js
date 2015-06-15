/**
 * Created by Gao Yuan on 2015/6/6.
 */
;(function($, window, undefined) {
    'use strict';
    $.fn.menuAccordion = function (options){
        var initMenu = function(){
/*
            $.each($('nav > ul.nav-menu > li.menu-group > .menu-group-title'), function(key, value){
                var group = $(value).parent('li.menu-group');
                group.toggleClass("active");
            } )
*/
            ($('nav > ul.nav-menu > li.menu-group > .menu-group-title')).on('click', function(){
                $(this).parent('li.menu-group').toggleClass("active");
            });
        }

        initMenu();
    }
})(jQuery, this);