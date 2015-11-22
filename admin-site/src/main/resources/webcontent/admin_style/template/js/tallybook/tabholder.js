/**
 * Created by Gao Yuan on 2015/8/7.
 */
;
var tallybook = tallybook || {};

(function ($, host) {
  var template = "" +
    '<ul class="nav nav-tabs">' +
    ' <li class="active">' +
    '   <a data-toggle="tab" href="#home">Home</a>' +
    ' </li>' +
    ' <li>' +
    '   <a data-toggle="tab" href="#menu1">Menu 1</a>' +
    ' </li>' +
    ' <li>' +
    '   <a data-toggle="tab" href="#menu2">Menu 2</a>' +
    ' </li>' +
    '</ul>' +

    '<div class="tab-content">' +
    ' <div id="home" class="tab-pane fade in active">' +
    ' </div>' +
    ' <div id="menu1" class="tab-pane fade">' +
    ' </div>' +
    ' <div id="menu2" class="tab-pane fade">' +
    ' </div>' +
    '</div>';

  function Tab(){
    this.active = false;
    this.title = 'Title placeholder';
    this.$contentHolder = null;
    this.$content = null;
  }
  Tab.prototype={
    active: function () {

    }
  };

  function TabHolder($ele, enableScroll){
    this.$ele = $ele;
    this.$nav = null;
    this.$content = null;
    this.initContainer(enableScroll);
  };
  TabHolder.prototype={
    initContainer : function (enableScroll) {
      this.$nav = this.$ele.find('ul.nav.nav-tabs');
      if(this.$nav.length == 0){
        var $nav = $('<ul class="nav nav-tabs">');
        this.$ele.append($nav);
        this.$nav = $nav;
      }
      this.$content = this.$ele.find('div.tab-content');
      if(this.$content.length == 0){
        var $content = $('<div class="tab-content">');
        this.$ele.append($content);
        this.$content = $content;
      }

      if(enableScroll){
        this.$ele.customScrollbar();
      }
    },
    tabs : function(){

    },
    addTab : function(name, title, $content, active){
      var id = ('' + Math.random()).replace('0.', 'id_');
      var $tag = active ? $('<li class="active">') : $('<li>');
      var $tagLink = $('<a data-toggle="tab">').attr('href', '#' + id).text(title);
      $tagLink.attr('data-tag-name', name);
      $tag.html($tagLink);

      var $contentHolder = $('<div class="tab-pane fade">');
      $contentHolder.attr('id', id);
      if(active)$contentHolder.addClass('in active');
      $contentHolder.html($content);

      this.$nav.append($tag);
      this.$content.append($contentHolder);
    },
    activeByIndexOrName:function(tag){
      var index = parseInt(tag);
      var $tabs = this.$nav.find('a[data-toggle=tab]');
      if(index != index){/*NaN*/
        $tabs.some()
      }
      var head = $($tabs[index]).trigger('click');

    }

  };

  host.tabholder = TabHolder;
})(jQuery, tallybook);