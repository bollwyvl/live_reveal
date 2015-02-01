/*
* ----------------------------------------------------------------------------
* Copyright (c) 2013 - Damián Avila
*
* Distributed under the terms of the Modified BSD License.
*
* An IPython notebook extension to support *Live* Reveal.js-based slideshows.
* -----------------------------------------------------------------------------
*/
;(function(){
  "use strict";

  // slide type constants
  var SLIDE = 'slide',
    SLIDE_END = 'slide_end',
    SUBSLIDE = 'subslide',
    FRAGMENT = 'fragment',
    FRAGMENT_END = 'fragment_end',
    NOTES = 'notes',
    SKIP = 'skip',
    DASH = '-';

  var ICON_SLIDE = 'fa-bar-chart-o',
    ICON_EXIT = 'fa-times-circle fa-4x fa',
    ICON_HELP = 'fa-question fa-4x fa';

  // require pre-flight
  var root = "/nbextensions/livereveal/";

  require.config({
    paths: {
      text: root + "lib/requirejs-text/text"
    }
  });

  require(
    [
      "jquery", "underscore",
      "base/js/namespace",
      "notebook/js/notebook"
    ],
    function($, _, IPython, notebook){

      notebook.Notebook.prototype.get_cell_elements = function () {
        /*
        * Version of get_cell_elements that will see cell divs at any depth in the HTML tree,
        * allowing container divs, etc to be used without breaking notebook machinery.
        * You'll need to make sure the cells are getting detected in the right order.
        */
        return this.container.find("div.cell");
      };

      IPython.toolbar.add_buttons_group([{
        label: 'Enter/Exit Live Reveal.js Slideshow',
        icon: ICON_SLIDE,
        callback: function(){
          revealMode('simple', 'page');
        },
        id: 'start_livereveal'
      }]);

      $(document).keydown(function(event) {
        if (event.which == 82 && event.altKey) {
          revealMode('simple', 'zoom');
          return false;
        }
        return true;
      });

      // reused jQuery selections
      var $mainToolbar = $('#maintoolbar');

      function revealMode(rtheme, rtransition) {
        /*
        * We search for a class tag in the maintoolbar to if Zenmode is "on".
        * If not, to enter the Zenmode, we hide "menubar" and "header" bars and
        * we append a customized css stylesheet to get the proper styles.
        */

        if (!$mainToolbar.hasClass('reveal_tagging')) {
          // Preparing the new reveal-compatible structure
          setupDict();
          labelCells();
          labelIntraSlides();
          Slider('slide', 'slide_end', 'div#notebook-container');

          // Adding the reveal stuff
          Revealer(rtheme, rtransition);

          // Minor modifications for usability
          setupKeys();
          buttonExit();
          buttonHelp();

          $mainToolbar.addClass('reveal_tagging');
        } else {
          Remover();

          $('.livereveal.btn').remove();

          try {
            button_rise();
          } catch(e) {
            console.log('An error has occurred: ' + e.message)
          }

          $mainToolbar.removeClass('reveal_tagging');
        }

        // And now we find the proper height and do a resize
        // IPython.layout_manager.do_resize();
      }


      function setupDict(){
        IPython.notebook.get_cells().forEach(function(cell){
          _.defaults(cell.metadata, {
            slideshow: {slide_type: DASH},
            internals: {slide_type: DASH}
          });
        });
      }


      function labelCells(){
        var cells = IPython.notebook.get_cells();

        cells.forEach(function(cell, i){
          var slideType = cell.metadata.slideshow.slide_type,
            prev = i ? cells[i - 1] : null,
            internalType = _.contains([SLIDE, SUBSLIDE], slideType) ?
              slideType :
              undefined,
            helperType = internalType ? internalType + '_end' : undefined;

          cell.metadata.internals.slide_type = internalType;

          if(prev){
            _.extend(prev.metadata, {
              internals: {
                slide_helper: helperType
              },
              slide_helper: helperType
            });
          }

          if(slideType === FRAGMENT){
            cell.metadata.internals.frag_number = i;
            cells.slice(i + 1).forEach(function(cell){
              _.update(cell.metadata.internals, {
                frag_helper: FRAGMENT_END,
                frag_number: i
              });
            });
          }
        });

        _.extend(cells[0].metadata, {
          slideshow: {slide_type: SLIDE},
          internals: {slide_type: SLIDE}
        });

        if(cells.length > 1){
          _.extend(cells[cells.length - 1].metadata, {
            slide_helper: SLIDE_END,
            internals: {slide_helper: SLIDE_END}
          });
        }

      }

      function labelIntraSlides(){
        IPython.notebook.get_cells().map(function(cell, i){
          var slideType = cell.metadata.slideshow.slide_type,
            $el = cell.element;

          if(slideType === FRAGMENT ||
              (slideType === DASH && cell.metadata.internals.frag_helper === FRAGMENT_END)){
            $el.addClass(FRAGMENT)
              .attr('data-fragment-index', cell.metadata.internals.frag_number);
          }else if(slideType === NOTES){
            $el.css("display", 'none');
          }else if(slideType === SKIP){
            $el.addClass(SKIP);
          }

        });
      }

      function Slider(begin, end, container) {
        // Hiding header and menu
        $('#header, #menubar-container').css('display', 'none');

        /*
         * The crazy rearrangement, I read the following some months ago,
         * It applies here withou any doubts ;-)
         * "When I wrote this, only God and I understood what I was doing
         * Now, God only knows"
        */

        var cells = IPython.notebook.get_cells();
        var counter = 0;
        for(var i=0; i<cells.length; i++){
          if (cells[i].metadata.slideshow.slide_type == begin) {
            var slide = [];
            $(container).append('<section id="'+begin+'_'+counter+'"></section>');
            for(var j=0; j<cells.length; j++){
              if (cells[i].metadata.slide_helper == end) {
                slide[j] = cells[i];
                break;
              }
              else if (cells[i].metadata.slide_helper != end) {
                slide[j] = cells[i];
                i++;
              }
            }
            console.log("slide:"+slide);
            slide[0].metadata.internals.slide_type = 'subslide';
            slide[slide.length - 1].metadata.internals.slide_helper = 'subslide_end';
            var counter2 = 0;
            for(var x=0; x<slide.length; x++){
              if (slide[x].metadata.internals.slide_type == 'subslide') {
                var subslide = [];
                $("section#"+begin+'_'+counter+"").append('<section id="subslide_'+counter+'_'+counter2+'"></section>');
                for(var y=0; y<slide.length; y++){
                  if (slide[x].metadata.internals.slide_helper == 'subslide_end') {
                    subslide[y] = slide[x];
                    break;
                  }
                  else if (slide[x].metadata.internals.slide_helper != 'subslide_end') {
                    subslide[y] = slide[x];
                    x++;
                  }
                }
                console.log("subslide:"+subslide);
                for(var z=0; z<subslide.length; z++){
                  $("section#subslide_"+counter+'_'+counter2+"").append(subslide[z].element);
                }
                counter2++;
              }
            }
            counter++;
          }
        }

        // Adding end_space after all the rearrangement
        $('.end_space').appendTo('div#notebook-container');
      }

      function makeCss(url, id){
        return $("<link/>", {
          rel: "stylesheet",
          href: require.toUrl("/nbextensions/livereveal/" + url),
          id: id
        });
      }

      function Revealer(ttheme, ttransition){
        // Bodier
        $('div#notebook').addClass("reveal");
        $('div#notebook-container').addClass("slides");

        // Header
        $('head').prepend(makeCss("lib/reveal.js/css/theme/simple.css", "theme"))
          .prepend(makeCss('css/reset_reveal.css', "revealcss"))
          .append(makeCss('css/main.css', 'maincss'));

        // Tailer
        require([root + 'lib/reveal.js/lib/js/head.min.js',
                 root + 'lib/reveal.js/js/reveal.js'], function(){
          // Full list of configuration options available here: https://github.com/hakimel/reveal.js#configuration
          Reveal.initialize({
            controls: true,
            progress: true,
            history: true,
            minScale: 1.0, //we need this to codemirror work right

            theme: Reveal.getQueryHash().theme || ttheme, // available themes are in /css/theme
            transition: Reveal.getQueryHash().transition || ttransition, // default/cube/page/concave/zoom/linear/none

            slideNumber: true,


            keyboard: {
              13: null, // Enter disabled
              27: null, // ESC disabled
              79: null, // o disabled
              87: function() {Reveal.toggleOverview();}, // w, toggle overview
              38: null, // up arrow disabled
              40: null, // down arrow disabled
              80: null, // p, up disable
              78: null, // n, down disable
              75: null, // k, up disabled
              74: null, // j, down disabled
              72: null, // h, left disabled
              76: null, // l, right disabled
              66: null, // b, black pause disabled, use period or forward slash
              // 83: null, // s, notes, but not working because notes is a plugin
            },

            // Optional libraries used to extend on reveal.js
            // Notes are working partially... it opens the notebooks, not the slideshows...
            dependencies: [
              //{ src: "static/custom/livereveal/reveal.js/lib/js/classList.js", condition: function() { return !document.body.classList; } },
              //{ src: "static/custom/livereveal/reveal.js/plugin/highlight/highlight.js", async: true, callback: function() { hljs.initHighlightingOnLoad(); } },
              {
                src: require.toUrl("/nbextensions/livereveal/lib/reveal.js/plugin/notes/notes.js"),
                async: true,
                condition: function() { return !!document.body.classList; }
              }
            ]
          });

          Reveal.addEventListener( 'ready', function( event ) {
            Unselecter();
            IPython.notebook.scroll_to_top();
          });

          Reveal.addEventListener( 'slidechanged', function( event ) {
            Unselecter();
            IPython.notebook.scroll_to_top();
          });
        });
      }

      function Unselecter(){
        IPython.notebook.get_cells().forEach(function(cell){
          cell.unselect();
        });
      }

      function setupKeys(){
        var manager = IPython.keyboard_manager;
        // command mode
        manager.command_shortcuts.remove_shortcut('shift-enter');
        manager.command_shortcuts.add_shortcut('shift-enter', function (event) {
          IPython.notebook.execute_cell();
          return false;
        });

        // edit mode
        manager.edit_shortcuts.remove_shortcut('shift-enter');
        manager.edit_shortcuts.add_shortcut('shift-enter', function (event) {
          IPython.notebook.execute_cell();
          return false;
        });
      }

      function KeysMessager() {
        require(["text!/nbextensions/livreveal/tmpl/keys.html"], function(tmpl){
          IPython.dialog.modal({
            title : "Reveal Shortcuts Help",
            body : $(tmpl),
            buttons : {
              OK : {class: "btn-primary"}
            }
          });
        });
      }

      function buttonHelp() {
        var help_button = $('<i/>', {
            id: 'help_b',
            title: 'Reveal Shortcuts Help'
          })
          .addClass(ICON_HELP)
          .addClass('my-main-tool-bar')
          .css({
            position: 'fixed',
            bottom: '0.5em',
            left: '0.6em',
            opacity: '0.6'
          })
          .click(function(){ KeysMessager(); });

        $('.reveal').after(help_button);
      }

      function buttonExit() {
        var exit_button = $('<i/>', {
            id: 'exit_b',
            title: 'RISE Exit'
          })
          .addClass(ICON_EXIT)
          .addClass('my-main-tool-bar')
          .css({
            position: 'fixed',
            bottom: '0.5em',
            left: '0.48em',
            opacity: '0.6'
          })
          .click(function(){ revealMode('simple', 'page'); });

        $('.reveal').after(exit_button);
      }

      function Remover() {
        $('#menubar-container').css('display','block');
        $('#header').css('display','block');

        $('div#notebook').removeClass("reveal");
        $('div#notebook-container').removeClass("slides")
          .css('width','1170px');

        $('#maincss').remove();
        $('#theme').remove();
        $('#revealcss').remove();

        $('.progress').remove();
        $('.controls').remove();
        $('.slide-number').remove();
        $('.state-background').remove();
        $('.pause-overlay').remove();

        var cells = IPython.notebook.get_cells();
        for(var i in cells){
          $('.cell:nth('+i+')').removeClass('fragment');
          $('.cell:nth('+i+')').removeClass('skip');
          $('div#notebook-container').append(cells[i].element);
        }

        $('div#notebook-container').children('section').remove();
        $('.end_space').appendTo('div#notebook-container');

        //IPython.layout_manager.do_resize();
      }
    }
  ); //require

}).call(this);
