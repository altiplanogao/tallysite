;
var tallybook;
if(!tallybook)
  tallybook={};

(function($, host){
  'use strict';

  var menu={
    init : (function () {
      var groupFloding = function ($nav) {
        $nav = $nav || $('nav');
        $nav.find('ul.nav-menu > li.menu-group > .menu-group-title').on('click', function(){
          $(this).parent('li.menu-group').toggleClass("active");
        });
      };
      return groupFloding;
    })(),
    initOnDocReady : function($doc){
      var $nav = $('nav#sideMenu');
      this.init($nav);
    }
  };
  
  host.menu = menu;
}($, tallybook));