/**
 * Created by Gao Yuan on 2015/8/11.
 */

+function ($) {

  $(document).on('click', '.slide-show > .indexer', function (event) {
    var $el = $(this), slider = $el.closest('.slide-show');
    slider.toggleClass('active');
  });
}(jQuery);