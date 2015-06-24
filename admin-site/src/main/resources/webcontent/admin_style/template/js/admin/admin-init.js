/**
 * Created by Gao Yuan on 2015/6/14.
 */
;(function ($, window, undefined) {
    'use strict';

    var $doc = $(document);

    $(document).ready(function() {
        $.fn.menuAccordionInit ? $doc.menuAccordionInit() : null;
        $.fn.listGridInit ? $doc.listGridInit() : null;
    });

})(jQuery, this);

